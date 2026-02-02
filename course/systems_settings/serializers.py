from rest_framework import serializers
from .models import SystemsSetting

class SystemsSettingSerializer(serializers.ModelSerializer):
    class Meta:
        model = SystemsSetting
        fields = [
            'id',
            'setting_group',
            'setting_key',
            'setting_value',
            'description',
            'admin',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
