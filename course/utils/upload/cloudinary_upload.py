from config import cloudinary_config  # noqa: F401 - ensure Cloudinary config is initialized
import cloudinary.uploader
from cloudinary.exceptions import Error as CloudinaryError


def upload_file_to_cloudinary(
    files,
    folder="uploads",
    resource_type="auto",
    delivery_type="upload",
):
    try:
        results = []
        for file in files:
            upload_result = cloudinary.uploader.upload(
                file,
                folder=folder,
                resource_type=resource_type,
                type=delivery_type,
            )
            results.append(
                {
                    "url": upload_result.get("secure_url"),
                    "public_id": upload_result.get("public_id"),
                    "format": upload_result.get("format"),
                    "resource_type": upload_result.get("resource_type"),
                    "type": upload_result.get("type"),
                }
            )
        return results
    except CloudinaryError as e:
        raise Exception(f"Upload to Cloudinary failed: {str(e)}")


def delete_file_from_cloudinary(public_ids):
    results = []
    for public_id in public_ids:
        try:
            cloudinary.uploader.destroy(public_id)
            results.append({"public_id": public_id, "deleted": True})
        except CloudinaryError as e:
            results.append({"public_id": public_id, "deleted": False, "error": str(e)})
    return results
