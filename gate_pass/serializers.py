from rest_framework import serializers
from django.utils import timezone
from .models import GatePass, GateLog
from accounts.serializers import UserMinimalSerializer


class GateLogSerializer(serializers.ModelSerializer):
    """Serializer for GateLog model."""
    
    marked_by = UserMinimalSerializer(read_only=True)
    
    class Meta:
        model = GateLog
        fields = ['id', 'action', 'timestamp', 'marked_by', 'notes']
        read_only_fields = ['id', 'timestamp', 'marked_by']


class GatePassCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating gate passes (students only)."""
    
    # Allowed pass types per residency type
    DAY_SCHOLAR_PASS_TYPES = ['DAY_OUT', 'HOME_LEAVE', 'EMERGENCY']
    HOSTELLER_PASS_TYPES = ['DAY_OUT', 'HOME_LEAVE', 'EMERGENCY', 'NIGHT_OUT', 'LONG_LEAVE']
    
    class Meta:
        model = GatePass
        fields = ['id', 'pass_type', 'reason', 'out_datetime', 'in_datetime', 
                  'qr_token', 'created_at']
        read_only_fields = ['id', 'qr_token', 'created_at']
    
    def validate(self, attrs):
        request = self.context.get('request')
        user = request.user
        
        # Ensure user is a student with a profile
        if user.role != 'student':
            raise serializers.ValidationError({
                'non_field_errors': 'Only students can create gate passes.'
            })
        
        if not hasattr(user, 'student_profile'):
            raise serializers.ValidationError({
                'non_field_errors': 'Student profile not found. Please complete your profile first.'
            })
        
        student_profile = user.student_profile
        residency_type = student_profile.residency_type
        pass_type = attrs.get('pass_type')
        out_datetime = attrs.get('out_datetime')
        in_datetime = attrs.get('in_datetime')
        
        # Validate out_datetime is in the future
        if out_datetime and out_datetime < timezone.now():
            raise serializers.ValidationError({
                'out_datetime': 'Out datetime must be in the future.'
            })
        
        # Validate in_datetime is after out_datetime
        if out_datetime and in_datetime and in_datetime <= out_datetime:
            raise serializers.ValidationError({
                'in_datetime': 'In datetime must be after out datetime.'
            })
        
        # Residency-based validation
        if residency_type == 'DAY_SCHOLAR':
            # Validate allowed pass types for day scholars
            if pass_type not in self.DAY_SCHOLAR_PASS_TYPES:
                raise serializers.ValidationError({
                    'pass_type': f'Day scholars can only request: {", ".join(self.DAY_SCHOLAR_PASS_TYPES)}. '
                                 f'NIGHT_OUT and LONG_LEAVE are only available for hostellers.'
                })
            
            # Validate same-day return for day scholars
            if out_datetime and in_datetime:
                if out_datetime.date() != in_datetime.date():
                    raise serializers.ValidationError({
                        'in_datetime': 'Day scholars must return on the same day. '
                                       'Out date and In date must be the same.'
                    })
        
        elif residency_type == 'HOSTELLER':
            # Validate allowed pass types for hostellers (all types allowed)
            if pass_type not in self.HOSTELLER_PASS_TYPES:
                raise serializers.ValidationError({
                    'pass_type': f'Invalid pass type. Allowed types: {", ".join(self.HOSTELLER_PASS_TYPES)}.'
                })
            # Hostellers can have multi-day passes, no additional date restriction
        
        return attrs
    
    def create(self, validated_data):
        validated_data['student'] = self.context['request'].user
        return super().create(validated_data)


class GatePassListSerializer(serializers.ModelSerializer):
    """Serializer for listing gate passes with minimal info."""
    
    student = UserMinimalSerializer(read_only=True)
    approved_by = UserMinimalSerializer(read_only=True)
    
    class Meta:
        model = GatePass
        fields = ['id', 'student', 'pass_type', 'reason', 'out_datetime', 
                  'in_datetime', 'status', 'approved_by', 'created_at']


class GatePassDetailSerializer(serializers.ModelSerializer):
    """Serializer for gate pass details including QR token and logs."""
    
    student = UserMinimalSerializer(read_only=True)
    approved_by = UserMinimalSerializer(read_only=True)
    logs = GateLogSerializer(many=True, read_only=True)
    is_valid = serializers.SerializerMethodField()
    
    class Meta:
        model = GatePass
        fields = ['id', 'student', 'pass_type', 'reason', 'out_datetime', 
                  'in_datetime', 'status', 'approved_by', 'approver_comment',
                  'qr_token', 'is_valid', 'logs', 'created_at', 'updated_at']
    
    def get_is_valid(self, obj):
        return obj.is_valid()


class GatePassApprovalSerializer(serializers.Serializer):
    """Serializer for approving/rejecting gate passes."""
    
    comment = serializers.CharField(required=False, allow_blank=True)


class SecurityScanSerializer(serializers.Serializer):
    """Serializer for security scanning (mark OUT/IN)."""
    
    qr_token = serializers.UUIDField(required=False)
    notes = serializers.CharField(required=False, allow_blank=True)
