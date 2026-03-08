from django.db import models
from django.contrib.auth.models import AbstractUser



class User(AbstractUser):
    email = models.EmailField(unique=True)
 
    is_online = models.BooleanField(default=False)
    last_seen = models.DateTimeField(null=True, blank=True)
    

    