from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.exceptions import ValidationError
from utils.permissions import RolePermissionFactory
from instructor_payouts.models import InstructorPayout
from instructor_payouts.services import auto_create_instructor_payouts, admin_update_instructor_payout, get_payouts_for_instructor, get_all_payouts_as_admin, delete_instructor_payout, 	get_payout_detail_by_id
class InstructorPayoutView(APIView):
    permission_classes = [RolePermissionFactory('instructor, admin')]

    def patch(self, request):
        # instructor = request.user.instructor
        # admin = request.user.admin
        # payout =auto_create_instructor_payouts(admin)
        # print(f"Fetching payouts for instructor: {instructor}")
        request_data = request.data
        period = request_data.get('period', None)
        processed_by = request.user.admin 
        payout_id = request_data.get('payout_id', None)
        status_payout = request_data.get('status', None)
        transaction_id = request_data.get('transaction_id', None)
        notes = request_data.get('notes', None)
        fee = request_data.get('fee', 0)
        processed_date = request_data.get('processed_date', None)
        payout = admin_update_instructor_payout(
            payout_id=payout_id,
            status=status_payout,
            transaction_id=transaction_id,
            notes=notes,
            fee=fee,
            processed_date=processed_date,
            processed_by=processed_by
        )
        if payout is None:
            return Response("Payout creation failed.", status=status.HTTP_400_BAD_REQUEST)
        return Response(payout, status=status.HTTP_200_OK)
    def get(self, request):
        user = request.user
        instructor = getattr(user, "instructor", None)
        admin = getattr(user, "admin", None)

        status_payout = request.query_params.get("status")
        period = request.query_params.get("period")
        processed_by = request.query_params.get("processed_by")
        instructor_id = request.query_params.get("instructor_id")
        payout_id = request.query_params.get("payout_id")
        
        try:
            if payout_id:
                payouts = get_payout_detail_by_id(payout_id=payout_id)

            elif instructor_id and admin:
                # Admin đang muốn xem payout của instructor cụ thể
                payouts = get_payouts_for_instructor(
                    instructor_id=instructor_id,
                    status=status_payout,
                    period=period
                )

            elif admin:
                payouts = get_all_payouts_as_admin(
                    status=status_payout,
                    period=period,
                    processed_by=processed_by
                )

            elif instructor:
                payouts = get_payouts_for_instructor(
                    instructor_id=instructor.id,
                    status=status_payout,
                    period=period
                )

            else:
                return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)
            print(f"Fetched payouts: {payouts}")
            return Response(payouts, status=status.HTTP_200_OK)

        except ValidationError as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
    def delete(self, request, payout_id):
        admin = request.user.admin
        if not admin:
            return Response({"detail": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)
        if not payout_id:
            return Response({"detail": "Payout ID is required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            delete_instructor_payout(payout_id=payout_id, admin_id=admin.id)
            return Response({"detail": "Payout deleted successfully."}, status=status.HTTP_204_NO_CONTENT)
        except ValidationError as e:
            return Response({"detail": str(e)}, status=status.HTTP_400_BAD_REQUEST)  



        