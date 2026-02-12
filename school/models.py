from django.db import models
from django.core.exceptions import ValidationError


class Stream(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(null=True, blank=True)

    def __str__(self):
        return self.name
    

class School(models.Model):
    name = models.CharField(max_length=255, unique=True)
    address = models.TextField(null=True, blank=True)
    contact_number = models.CharField(max_length=15, null=True, blank=True)
    streams = models.ManyToManyField('Stream', related_name='schools', blank=True)

    def __str__(self):
        return self.name

class Classroom(models.Model):
    
    CLASS_CHOICES = [
        ('Nursery', 'Nursery'),
        ('LKG', 'LKG'),
        ('UKG', 'UKG'),
        ('1', 'Class 1'),
        ('2', 'Class 2'),
        ('3', 'Class 3'),
        ('4', 'Class 4'),
        ('5', 'Class 5'),
        ('6', 'Class 6'),
        ('7', 'Class 7'),
        ('8', 'Class 8'),
        ('9', 'Class 9'),
        ('10', 'Class 10'),
        ('11', 'Class 11'),
        ('12', 'Class 12'),
    ]

    
    SECTION_CHOICES = [
        ('A', 'Section A'),
        ('B', 'Section B'),
        ('C', 'Section C'),
        ('D', 'Section D'),
        ('E', 'Section E'),
    ]

    school = models.ForeignKey("School", on_delete=models.CASCADE, related_name="classrooms")
    class_name = models.CharField(max_length=20, choices=CLASS_CHOICES)
    stream = models.ForeignKey("Stream", related_name="classrooms", null=True, blank=True, on_delete=models.CASCADE,)
    section = models.CharField(max_length=1, choices=SECTION_CHOICES)

    def clean(self):
        
        if self.class_name in ['11', '12'] and not self.stream:
            raise ValidationError("Stream is reqquird for Class 11 and 12.")
        if self.class_name not in ['11', '12'] and self.stream:
            raise ValidationError("Stream should only be selected for Class 11 and 12.")
 
    def __str__(self):
        return f"{self.school.name} - {self.get_class_name_display()} {self.get_section_display()}"

