/* ================================================================
   COMPONENT: TOAST NOTIFICATIONS
   js/components/toast.js
   ================================================================ */

var ToastComponent = (function ($) {
    'use strict';

    function show(message, type, duration) {
        type = type || 'info';
        duration = duration || 3500;

        var container = $('#toastContainer');
        if (container.length === 0) {
            container = $('<div class="toast-container" id="toastContainer"></div>').appendTo('body');
        }

        var toast = $('<div>')
            .addClass('toast toast-' + type);

        $('<span>')
            .text(message)
            .appendTo(toast);

        container.append(toast);

        setTimeout(function () {
            toast.fadeOut(300, function () { $(this).remove(); });
        }, duration);
    }

    return {
        show: show
    };
})(jQuery);
