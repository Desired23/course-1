from rest_framework import serializers
from .models import SystemsSetting

class SystemsSettingSerializer(serializers.ModelSerializer):
    key = serializers.SerializerMethodField()
    value = serializers.SerializerMethodField()
    group = serializers.SerializerMethodField()

    def get_key(self, obj):
        return obj.setting_key

    def get_value(self, obj):
        return obj.setting_value

    def get_group(self, obj):
        return obj.setting_group

    class Meta:
        model = SystemsSetting
        fields = [
            'id',
            'setting_group',
            'setting_key',
            'setting_value',
            'group',
            'key',
            'value',
            'description',
            'admin',
            'created_at',
            'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
