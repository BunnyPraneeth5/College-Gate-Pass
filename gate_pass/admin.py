from django.contrib import admin
from .models import GatePass, GateLog


@admin.register(GatePass)
class GatePassAdmin(admin.ModelAdmin):
    list_display = ['id', 'student', 'pass_type', 'status', 'out_datetime', 'in_datetime', 'approved_by', 'created_at']
    list_filter = ['pass_type', 'status', 'created_at']
    search_fields = ['student__email', 'student__first_name', 'reason', 'qr_token']
    readonly_fields = ['qr_token', 'created_at', 'updated_at']
    raw_id_fields = ['student', 'approved_by']
    date_hierarchy = 'created_at'


@admin.register(GateLog)
class GateLogAdmin(admin.ModelAdmin):
    list_display = ['id', 'gate_pass', 'action', 'timestamp', 'marked_by']
    list_filter = ['action', 'timestamp']
    search_fields = ['gate_pass__student__email', 'gate_pass__qr_token']
    readonly_fields = ['timestamp']
    raw_id_fields = ['gate_pass', 'marked_by']
