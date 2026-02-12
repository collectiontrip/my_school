from rest_framework.routers import DefaultRouter
from .views import StreamViewSet, SchoolViewSet

router = DefaultRouter()
router.register(r'streams', StreamViewSet, basename='stream')
router.register(r'schools', SchoolViewSet, basename='school')
router.register(r'classroom', SchoolViewSet, basename='classroom')

urlpatterns = router.urls