function customConfirmModal({
  title = "Xác nhận",
  message = "",
  note = "",
  type = "info",
  buttons = []
}) {
  $("#customConfirmModal").remove();

  let buttonsHtml = buttons.map((btn, i) => `
    <button type="button" class="btn ${btn.class || "btn-secondary"} btn-action" data-idx="${i}">
      ${btn.text}
    </button>
  `).join("");

  let alertClass = "";
  if (type === "danger") alertClass = "alert-danger";
  else if (type === "success") alertClass = "alert-success";
  else alertClass = "alert-info";

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
              <div class="alert ${alertClass} d-flex align-items-center">
                <i class="fa fa-exclamation-triangle mr-2"></i>
                <div>
                  <strong>Lưu ý:</strong><br>
                  ${note}
                </div>
              </div>
            ` : ""}
          </div>

          <div class="modal-footer">
            ${buttonsHtml}
          </div>

        </div>
      </div>
    </div>
    `;

  $("body").append(modalHtml);

  let $dialog = $("#customConfirmModal");

  $dialog.find(".btn-action").on("click", function () {
    let idx = $(this).data("idx");
    if (buttons[idx].onClick) buttons[idx].onClick();
    $dialog.modal("hide");
  });

  $dialog.find(".close").on("click", function () {
    $dialog.modal("hide");
  });

  $dialog.modal("show");
}
