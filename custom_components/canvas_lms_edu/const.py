"""Constants for the Canvas LMS integration."""

from datetime import timedelta
import logging

DOMAIN = "canvas_lms_edu"
LOGGER = logging.getLogger(__package__)

CONF_USER_ID = "user_id"

UPDATE_INTERVAL = timedelta(minutes=30)

FRONTEND_URL = f"/{DOMAIN}/frontend"
CARD_FILENAME = "canvas-lms-courses-card.js"
