/* ================================================================
   COMPONENT: MODAL & CONFIRM DIALOGS
   js/components/modal.js
   ================================================================ */

var ModalComponent = (function ($) {
    'use strict';

    function show(contentHtml, size) {
        var modal = $('#modalContent');
        modal.removeClass('modal-lg modal-sm');
        if (size === 'lg') modal.addClass('modal-lg');
        if (size === 'sm') modal.addClass('modal-sm');

        modal.html(contentHtml);
        $('#modalOverlay').addClass('active');
        $('body').css('overflow', 'hidden');
    }

    function close() {
        $('#modalOverlay').removeClass('active');
        $('#modalContent').empty();
        $('body').css('overflow', '');
    }

    function confirm(message, onConfirm) {
        var html =
            '<div class="modal-header">' +
            '  <h3>Xác nhận thao tác</h3>' +
            '  <button class="modal-close" onclick="ModalComponent.close()">&times;</button>' +
            '</div>' +
            '<div class="modal-body">' +
            '  <p style="font-size:0.92rem; color:#334155; line-height:1.6;">' + message + '</p>' +
            '</div>' +
            '<div class="modal-footer">' +
            '  <button class="btn btn-outline" onclick="ModalComponent.close()">Hủy</button>' +
            '  <button class="btn btn-primary" id="btnModalConfirmAction">Đồng ý</button>' +
            '</div>';

        show(html, 'sm');

        $('#btnModalConfirmAction').off('click').on('click', function () {
            close();
            if (typeof onConfirm === 'function') {
                onConfirm();
            }
        });
    }

    // Lắng nghe sự kiện click overlay hoặc phím Escape để đóng
    $(document).ready(function () {
        $('#modalOverlay').on('click', function (e) {
            if (e.target === this) close();
        });

        $(document).on('keydown', function (e) {
            if (e.key === 'Escape') close();
        });
    });

    return {
        show: show,
        close: close,
        confirm: confirm
    };
})(jQuery);
