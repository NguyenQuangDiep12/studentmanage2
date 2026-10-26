/* ================================================================
   API.JS - Gọi API backend PHP bằng jQuery AJAX
   - Tự gắn header Authorization: Bearer <token>
   - Gửi/nhận JSON
   - Hết phiên (401) -> quay về trang đăng nhập
   - Frontend không tự kiểm tra dữ liệu: hiển thị message lỗi do API trả về
   ================================================================ */

var Api = (function ($) {
    'use strict';

    /**
     * Token và thông tin người dùng luôn đọc THEO CẶP từ cùng một nơi lưu:
     * ưu tiên sessionStorage của tab hiện tại, nếu không có mới lấy localStorage.
     * (Trước đây token lấy từ sessionStorage còn user lấy từ localStorage -> khi 2 tab đăng nhập 2 tài khoản
     *  khác nhau, giao diện hiện tài khoản này nhưng lại gửi Bearer token của tài khoản kia.)
     */
    function getSession() {
        var stores = [sessionStorage, localStorage];
        for (var i = 0; i < stores.length; i++) {
            try {
                var t = stores[i].getItem('sms_access_token');
                var u = stores[i].getItem('sms_current_user');
                if (t && u) return { token: t, user: JSON.parse(u) };
            } catch (e) { /* bỏ qua bộ lưu lỗi */ }
        }
        return null;
    }

    function getToken() {
        var s = getSession();
        return s ? s.token : null;
    }

    function clearSession() {
        ['sms_access_token', 'sms_current_user'].forEach(function (k) {
            sessionStorage.removeItem(k);
            localStorage.removeItem(k);
        });
    }

    /**
     * Header xác thực duy nhất của hệ thống: "Authorization: Bearer <token>".
     * <token> là chuỗi JWT thuần (không kèm chữ "Bearer"); backend tách lấy đúng phần sau "Bearer ".
     */
    function authHeaders() {
        var token = getToken();
        if (!token) return {};
        token = String(token).replace(/^\s*Bearer\s+/i, '').trim(); // phòng dữ liệu cũ lỡ lưu kèm "Bearer"
        return { Authorization: 'Bearer ' + token };
    }

    function request(method, url, data) {
        var opts = {
            url: url,
            method: method,
            dataType: 'json',
            headers: authHeaders()
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
        getSession: getSession,
        authHeaders: authHeaders,
        clearSession: clearSession
    };
})(jQuery);
