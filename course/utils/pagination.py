from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from collections import OrderedDict


class StandardPagination(PageNumberPagination):
    """
    Standard pagination class for the project.
    Usage in APIView:
        paginator = StandardPagination()
        result_page = paginator.paginate_queryset(queryset, request)
        serializer = MySerializer(result_page, many=True)
        return paginator.get_paginated_response(serializer.data)
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100
    page_query_param = 'page'

    def get_paginated_response(self, data):
        return Response(OrderedDict([
            ('count', self.page.paginator.count),
            ('next', self.get_next_link()),
            ('previous', self.get_previous_link()),
            ('page', self.page.number),
            ('total_pages', self.page.paginator.num_pages),
            ('page_size', self.get_page_size(self.request)),
            ('results', data),
        ]))


def paginate_queryset(queryset, request, serializer_class, page_size=None, context=None):
    """
    Helper function to paginate a queryset in an APIView.
    
    Args:
        queryset: Django QuerySet to paginate
        request: DRF Request object
        serializer_class: Serializer class to use
        page_size: Optional custom page size (overrides default 20)
        context: Optional serializer context dict
    
    Returns:
        Response with paginated data in format:
        {
            "count": 150,
            "next": "http://...?page=2",
            "previous": null,
            "page": 1,
            "total_pages": 8,
            "page_size": 20,
            "results": [...]
        }
        
    Usage:
        from utils.pagination import paginate_queryset
        
        def get(self, request):
            queryset = MyModel.objects.all()
            return paginate_queryset(queryset, request, MySerializer)
    """
    paginator = StandardPagination()
    if page_size:
        paginator.page_size = page_size
    
    result_page = paginator.paginate_queryset(queryset, request)
    
    serializer_context = {'request': request}
    if context:
        serializer_context.update(context)
    
    serializer = serializer_class(result_page, many=True, context=serializer_context)
    return paginator.get_paginated_response(serializer.data)
