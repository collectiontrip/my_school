from django.contrib import admin
from .models import School, Stream, Classroom

@admin.register(Stream)
class StreamAdmin(admin.ModelAdmin):
    list_display = ['name', 'description']

@admin.register(School)
class SchoolAdmin(admin.ModelAdmin):
    list_display = ['name', 'get_streams']

    def get_streams(self, obj):
        return " , ".join([stream.name for stream in obj.streams.all()])
    
    get_streams.short_description = 'Streams'

@admin.register(Classroom)
class ClassroomAdmin(admin.ModelAdmin):
    list_display = ['school', 'class_name', 'section', 'stream']




   

   