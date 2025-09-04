// public/js/custom_confirm.js
function customConfirm({
  title = "Xác nhận",
  message = "",
  note = "",
  onConfirm = null
}) {
  $("#customConfirmModal").remove();

  let modalHtml = `
    <div class="modal fade" id="customConfirmModal" tabindex="-1" role="dialog" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered" role="document">
        <div class="modal-content">

          <div class="modal-header">
            <h5 class="modal-title fw-bold">${title}</h5>
            <button type="button" class="close" aria-label="Close">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>

          <div class="modal-body">
            <p>${message}</p>
            ${note ? `
              <div class="alert alert-info d-flex align-items-center">
                <i class="fa fa-exclamation-triangle mr-2"></i>
                <div>
                  <strong>Lưu ý:</strong><br>
                  ${note}
                </div>
              </div>
            ` : ""}
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary btn-cancel">Hủy bỏ</button>
            <button type="button" class="btn btn-primary btn-ok">Xác nhận</button>
          </div>

        </div>
      </div>
    </div>
    `;

  $("body").append(modalHtml);

  let $dialog = $("#customConfirmModal");

  $dialog.find(".btn-ok").on("click", function () {
    if (onConfirm) onConfirm();
    $dialog.modal("hide");
  });

  $dialog.find(".btn-cancel, .close").on("click", function () {
    $dialog.modal("hide");
  });

  $dialog.modal("show");
}
