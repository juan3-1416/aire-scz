from django.contrib import admin

from .models import Alert, Measurement, Station


@admin.register(Station)
class StationAdmin(admin.ModelAdmin):
    list_display = ("name", "zone", "is_active", "created_at")
    list_filter = ("is_active", "zone")
    search_fields = ("name", "zone")


@admin.register(Measurement)
class MeasurementAdmin(admin.ModelAdmin):
    list_display = ("station", "recorded_at", "pm25", "co", "o3")
    list_filter = ("station",)
    search_fields = ("station__name",)
    ordering = ("-recorded_at",)


@admin.register(Alert)
class AlertAdmin(admin.ModelAdmin):
    list_display = ("pollutant", "level", "measurement", "is_active", "created_at")
    list_filter = ("pollutant", "level", "is_active")
    search_fields = ("message", "measurement__station__name")
    ordering = ("-created_at",)