from django.db import models
from django.contrib.auth.models import AbstractUser



class User(AbstractUser):
    email = models.EmailField(unique=True)
    last_seen = models.DateTimeField(null=True, blank=True)
    
