from django.shortcuts import render
from rest_framework.viewsets import ModelViewSet
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated, IsAuthenticatedOrReadOnly
from .models import Stream, School, Classroom
from .permissions import IsAdminOrReadOnly
from .serializers import StreamSerializer, SchoolSerializer


class StreamViewSet(ModelViewSet):
    queryset = Stream.objects.all()
    serializer_class = StreamSerializer
    search_fields = ['name', 'description']
    permission_classes = [IsAdminOrReadOnly]


class SchoolViewSet(ModelViewSet):
    queryset = School.objects.all()
    serializer_class = SchoolSerializer
    search_fields = ['name', 'address', 'streams']
    permission_classes = [IsAdminOrReadOnly]



    
        

    
   




