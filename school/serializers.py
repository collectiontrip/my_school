from rest_framework import serializers
from .models import Stream, School, Classroom


class StreamSerializer(serializers.ModelSerializer):

    class Meta:
        model = Stream
        fields = ['id','name', 'description']

class SchoolSerializer(serializers.ModelSerializer):

    class Meta:
        model = School
        fields = ['id','name', 'address', 'contact_number', 'streams' ]


class ClassroomSrializr(serializers.ModelSerializer):

    class Meta:
        model = Classroom
        fields = ['school', 'class_name', 'stream', 'section']

        