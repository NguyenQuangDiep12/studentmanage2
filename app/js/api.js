/* ================================================================
   API.JS - Gọi API backend PHP bằng jQuery AJAX
   - Tự gắn header Authorization: Bearer <token>
   - Gửi/nhận JSON
   - Hết phiên (401) -> quay về trang đăng nhập
   - Frontend không tự kiểm tra dữ liệu: hiển thị message lỗi do API trả về
   ================================================================ */

var Api = (function ($) {
    'use strict';

    function getToken() {
        return sessionStorage.getItem('sms_access_token') || localStorage.getItem('sms_access_token');
    }

    function clearSession() {
        ['sms_access_token', 'sms_current_user'].forEach(function (k) {
            sessionStorage.removeItem(k);
            localStorage.removeItem(k);
        });
    }

    function request(method, url, data) {
        var token = getToken();
        var opts = {
            url: url,
            method: method,
            dataType: 'json',
            headers: token ? { Authorization: 'Bearer ' + token } : {}
        };

        if (method === 'GET' || method === 'DELETE') {
            // Tham số gửi qua query string
            if (data) {
                opts.url = url + (url.indexOf('?') === -1 ? '?' : '&') + $.param(data);
            }
        } else {
            opts.contentType = 'application/json; charset=utf-8';
            opts.data = JSON.stringify(data || {});
        }

        return $.ajax(opts).fail(function (xhr) {
            if (xhr.status === 401 && url.indexOf('/api/taikhoan/dang-nhap') === -1) {
                clearSession();
                if (typeof ToastComponent !== 'undefined') {
                    ToastComponent.show(errorMessage(xhr), 'error');
                }
                setTimeout(function () { window.location.href = 'index.html'; }, 1200);
            }
        });
    }

    function errorMessage(xhr, fallback) {
        var body = xhr && xhr.responseJSON;
        if (body && body.message) return body.message;
        if (xhr && xhr.status === 0) return 'Không thể kết nối máy chủ PHP. Vui lòng kiểm tra backend.';
        return fallback || 'Đã xảy ra lỗi khi gọi API.';
    }

    // Dùng cho .fail(Api.toastError)
    function toastError(xhr) {
        if (xhr && xhr.status === 401) return;
        App.showToast(errorMessage(xhr), 'error');
    }

    return {
        get: function (url, params) { return request('GET', url, params); },
        post: function (url, body) { return request('POST', url, body); },
        put: function (url, body) { return request('PUT', url, body); },
        del: function (url, params) { return request('DELETE', url, params); },
        errorMessage: errorMessage,
        toastError: toastError,
        getToken: getToken,
        clearSession: clearSession
    };
})(jQuery);
