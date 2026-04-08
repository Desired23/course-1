class AdvisorServiceError(Exception):
    code = 'advisor_error'

    def __init__(self, message, *, code=None):
        super().__init__(message)
        if code:
            self.code = code


class AdvisorUpstreamError(AdvisorServiceError):
    code = 'upstream_unavailable'


class AdvisorValidationError(AdvisorServiceError):
    code = 'invalid_request'


class AdvisorInternalError(AdvisorServiceError):
    code = 'internal_error'
