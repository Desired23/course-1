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

    # Sanitize page and page_size query params to avoid malformed values (e.g. "[object Object]")
    try:
        # request is a DRF Request; underlying Django request is request._request
        raw_req = getattr(request, '_request', None)
        if raw_req is not None and hasattr(raw_req, 'GET'):
            from django.http import QueryDict
            q = raw_req.GET.copy()
            page_key = paginator.page_query_param
            page_val = q.get(page_key)
            if page_val is not None:
                # allow numeric strings only
                if not str(page_val).lstrip('-').isdigit():
                    q.pop(page_key, None)
            # sanitize page_size too
            psize_key = paginator.page_size_query_param
            psize_val = q.get(psize_key)
            if psize_val is not None and not str(psize_val).isdigit():
                q.pop(psize_key, None)
            raw_req.GET = q
    except Exception:
        # If sanitization fails, continue and let paginator handle errors
        pass

    result_page = paginator.paginate_queryset(queryset, request)
    
    serializer_context = {'request': request}
    if context:
        serializer_context.update(context)
    
    serializer = serializer_class(result_page, many=True, context=serializer_context)
    return paginator.get_paginated_response(serializer.data)
