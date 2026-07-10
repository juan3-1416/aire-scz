from django.contrib.gis.db import models
from django.core.validators import MinValueValidator


class Station(models.Model):
    name = models.CharField(
        max_length=120,
        unique=True,
        verbose_name="Nombre",
    )
    zone = models.CharField(
        max_length=120,
        verbose_name="Zona",
    )
    location = models.PointField(
        srid=4326,
        geography=True,
        verbose_name="Ubicación",
        help_text="Punto geográfico en formato longitud, latitud.",
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name="Activa",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Estación"
        verbose_name_plural = "Estaciones"
        ordering = ["name"]

    def __str__(self):
        return f"{self.name} - {self.zone}"


class Measurement(models.Model):
    class Source(models.TextChoices):
        SIMULATED = "SIMULATED", "Simulado"
        IQAIR = "IQAIR", "IQAir"

    station = models.ForeignKey(
        Station,
        on_delete=models.CASCADE,
        related_name="measurements",
        verbose_name="Estación",
    )
    recorded_at = models.DateTimeField(
        verbose_name="Fecha y hora de medición",
    )

    pm25 = models.FloatField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        verbose_name="PM2.5",
        help_text="Concentración en µg/m³.",
    )
    co = models.FloatField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        verbose_name="CO",
        help_text="Concentración en ppm.",
    )
    o3 = models.FloatField(
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        verbose_name="O₃",
        help_text="Concentración en ppb.",
    )

    source = models.CharField(
        max_length=20,
        choices=Source.choices,
        default=Source.SIMULATED,
        verbose_name="Fuente de datos",
    )
    aqi_us = models.IntegerField(
        null=True,
        blank=True,
        verbose_name="AQI US",
    )
    main_pollutant = models.CharField(
        max_length=20,
        blank=True,
        verbose_name="Contaminante principal",
    )
    source_city = models.CharField(
        max_length=120,
        blank=True,
        verbose_name="Ciudad fuente",
    )
    source_payload = models.JSONField(
        null=True,
        blank=True,
        verbose_name="Respuesta original de la API",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Medición"
        verbose_name_plural = "Mediciones"
        ordering = ["-recorded_at"]
        indexes = [
            models.Index(
                fields=["station", "-recorded_at"],
                name="measurement_station_time_idx",
            ),
            models.Index(
                fields=["-recorded_at"],
                name="measurement_recorded_time_idx",
            ),
            models.Index(
                fields=["source", "-recorded_at"],
                name="measurement_source_time_idx",
            ),
        ]

    def __str__(self):
        return f"{self.station.name} - {self.recorded_at:%d/%m/%Y %H:%M}"

class Alert(models.Model):
    class Pollutant(models.TextChoices):
        PM25 = "PM25", "PM2.5"
        CO = "CO", "CO"
        O3 = "O3", "O₃"

    class Level(models.TextChoices):
        MODERATE = "MODERATE", "Moderada"
        HIGH = "HIGH", "Alta"
        CRITICAL = "CRITICAL", "Crítica"

    measurement = models.ForeignKey(
        Measurement,
        on_delete=models.CASCADE,
        related_name="alerts",
        verbose_name="Medición",
    )
    pollutant = models.CharField(
        max_length=10,
        choices=Pollutant.choices,
        verbose_name="Contaminante",
    )
    level = models.CharField(
        max_length=15,
        choices=Level.choices,
        verbose_name="Nivel",
    )
    message = models.TextField(
        verbose_name="Mensaje",
    )
    is_active = models.BooleanField(
        default=True,
        verbose_name="Activa",
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Alerta"
        verbose_name_plural = "Alertas"
        ordering = ["-created_at"]
        indexes = [
            models.Index(
                fields=["is_active", "-created_at"],
                name="alert_active_created_idx",
            ),
        ]

    def __str__(self):
        return f"{self.get_level_display()} - {self.get_pollutant_display()}"