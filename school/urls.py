from django.urls import path , include
from .router import urlpatterns as course_router_urls

urlpatterns = [
    path('', include(course_router_urls))
]