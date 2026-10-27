"""Domain exceptions raised by the service layer and mapped to HTTP responses in ``main``."""


class DomainError(Exception):
    """Base class for expected, user-facing errors."""

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class NotFoundError(DomainError):
    pass


class InvalidOperationError(DomainError):
    pass
