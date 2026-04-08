from django.urls import path

from .views import SearchSuggestionsView, SearchTrackView


urlpatterns = [
    path('search/suggestions/', SearchSuggestionsView.as_view(), name='search-suggestions'),
    path('search/track/', SearchTrackView.as_view(), name='search-track'),
]

