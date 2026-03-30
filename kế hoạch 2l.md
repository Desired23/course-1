# Kế hoạch 2L

## Trạng thái

Pha rà soát và chuẩn hóa text hệ thống FE đã hoàn thành 100% theo tiêu chí hiện tại:

- `npm run build` pass
- `npm run i18n:audit` không còn cảnh báo hard-code UI text

File này lưu phần kế hoạch còn lại sau khi đã hoàn tất đợt sweep chính.

## Mục tiêu pha 2

1. Giữ trạng thái `0 hard-coded UI text` ổn định theo thời gian.
2. Chặn text cứng mới ngay từ lúc developer commit code.
3. Chuẩn hóa quy ước đặt key, thêm locale và review i18n cho các tính năng mới.
4. Bổ sung QA đổi ngôn ngữ theo route trọng yếu để tránh regression hiển thị.

## Phạm vi còn lại

### 1. Regression QA theo màn hình

- Chạy smoke test `vi/en` cho các route chính:
  - `public`
  - `auth`
  - `user`
  - `instructor`
  - `admin`
- Kiểm tra đủ các state:
  - loading
  - empty
  - success
  - error
  - dialog
  - toast
  - permission denied
- Ưu tiên lại các màn rủi ro cao:
  - payment / checkout / refund
  - course player / lesson preview
  - notification / chat
  - admin payment / website config / homepage layout
  - instructor lesson editor / communication

### 2. Guardrail trong CI

- Đưa `npm run i18n:audit` vào pipeline CI.
- Rule đề xuất:
  - build fail nếu audit phát hiện literal UI text mới
  - cho phép whitelist rất hẹp, có lý do rõ ràng
- Nếu chưa muốn fail cứng ngay:
  - giai đoạn đầu chỉ cảnh báo
  - sau 1-2 vòng release chuyển sang fail cứng

### 3. Quy ước bắt buộc cho feature mới

- Mọi text hiển thị phải đi qua i18n ngay từ lúc code.
- Không merge text hard-code trong:
  - JSX
  - toast
  - confirm dialog
  - placeholder
  - table labels
  - filter config
  - empty/error/loading state
- Không để backlog locale bổ sung sau.
- Mỗi key mới phải có đủ:
  - `en`
  - `vi`

### 4. Chuẩn hóa naming key

- Namespace theo domain màn hình hoặc component, không dồn bừa vào `common`.
- Mẫu:
  - `payment_management.refunds.workflow.title`
  - `topic_page.topics.react.description`
  - `lesson_preview_modal.tabs.notes`
- `common` chỉ dùng cho text thật sự phổ quát.

### 5. Review policy cho dữ liệu backend và mock content

- Phân biệt rõ 3 nhóm:
  - text hệ thống FE sinh ra: bắt buộc i18n
  - dữ liệu người dùng nhập: giữ nguyên
  - dữ liệu business/mock render ra UI: nếu FE sở hữu thì phải key-based hoặc localized
- Với backend message:
  - ưu tiên map từ code/status sang key i18n
  - không hiển thị raw backend text nếu có thể tránh

### 6. Theo dõi locale quality

- Rà định kỳ các vấn đề:
  - key chết
  - key trùng nghĩa
  - key sai namespace
  - dịch không đồng nhất
  - text tiếng Việt không dấu hoặc lỗi encoding
- Khi chạm file locale cũ:
  - ưu tiên giữ UTF-8 chuẩn
  - sửa dần các chuỗi mojibake nếu còn

## Checklist thực thi đề xuất

### Ngắn hạn

1. Thêm `npm run i18n:audit` vào CI.
2. Viết guideline ngắn cho team về quy ước i18n.
3. Chạy smoke test đổi ngôn ngữ trên nhóm route rủi ro cao.

### Trung hạn

1. Viết script phát hiện key chết.
2. Viết script so khớp cặp key `en/vi`.
3. Thêm review item i18n vào PR template.

### Dài hạn

1. Tách locale theo domain nếu file locale hiện tại quá lớn.
2. Chuẩn hóa helper cho status text, pluralization, formatter.
3. Tạo quy trình localization review trước mỗi release.

## Định nghĩa hoàn tất pha 2

Pha 2 được xem là xong khi đạt đủ:

- CI có chặn regression i18n
- QA `vi/en` cho route chính đã chạy ít nhất 1 vòng
- Có guideline áp dụng cho feature mới
- Có cơ chế phát hiện thiếu key và key chết
- Không tái phát hard-code UI text trong các vòng commit tiếp theo
