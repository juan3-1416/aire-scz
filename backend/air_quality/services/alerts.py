from air_quality.models import Alert, Measurement


POLLUTANT_RULES = {
    "PM25": {
        "field": "pm25",
        "label": "PM2.5",
        "unit": "µg/m³",
        "thresholds": [
            (25, Alert.Level.MODERATE),
            (55, Alert.Level.HIGH),
            (150, Alert.Level.CRITICAL),
        ],
    },
    "CO": {
        "field": "co",
        "label": "CO",
        "unit": "ppm",
        "thresholds": [
            (4, Alert.Level.MODERATE),
            (9, Alert.Level.HIGH),
            (15, Alert.Level.CRITICAL),
        ],
    },
    "O3": {
        "field": "o3",
        "label": "O₃",
        "unit": "ppb",
        "thresholds": [
            (60, Alert.Level.MODERATE),
            (90, Alert.Level.HIGH),
            (120, Alert.Level.CRITICAL),
        ],
    },
}


def get_alert_level(pollutant: str, value: float):
    """Devuelve el nivel de alerta o None si el valor es normal."""
    thresholds = POLLUTANT_RULES[pollutant]["thresholds"]

    for minimum_value, level in reversed(thresholds):
        if value >= minimum_value:
            return level

    return None


def build_alerts_for_measurement(measurement: Measurement) -> list[Alert]:
    """Construye alertas para una medición sin guardarlas todavía."""
    alerts = []

    for pollutant, rule in POLLUTANT_RULES.items():
        value = getattr(measurement, rule["field"])
        level = get_alert_level(pollutant, value)

        if level is None:
            continue

        level_label = Alert.Level(level).label

        alerts.append(
            Alert(
                measurement=measurement,
                pollutant=pollutant,
                level=level,
                message=(
                    f"{level_label}: {rule['label']} = {value:.2f} "
                    f"{rule['unit']} en {measurement.station.name}. "
                    f"Fecha: {measurement.recorded_at:%d/%m/%Y %H:%M}."
                ),
            )
        )

    return alerts