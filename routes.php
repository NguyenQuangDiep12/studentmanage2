<?php

$modules = [
    'taikhoan' => [
        'name' => 'Taikhoan',
        'path' => 'app/module/Taikhoan',
        'prefix' => '/api/taikhoan',
    ],
    'monhoc' => [
        'name' => 'Monhoc',
        'path' => 'app/module/Monhoc',
        'prefix' => '/api/monhoc',
    ],
    'lophocphan' => [
        'name' => 'Lophocphan',
        'path' => 'app/module/Lophocphan',
        'prefix' => '/api/lophocphan',
    ],
    'dangkyhocphan' => [
        'name' => 'Dangkyhocphan',
        'path' => 'app/module/Dangkyhocphan',
        'prefix'=> '/api/dangkyhocphan',
    ],
    'ketquahoctap' => [
        'name' => 'Ketquahoctap',
        'path' => 'app/module/Ketquahoctap',
        'prefix'=> '/api/ketquahoctap',
    ],
    'tintuc' => [
        'name' => 'Tintuc',
        'path' => 'app/module/Tintuc',
        'prefix'=> '/api/tintuc',
    ],
    'kiennghi' => [
        'name' => 'Kiennghi',
        'path' => 'app/module/Kiennghi',
        'prefix'=> '/api/kiennghi',
    ],
    'cocaudaotao' => [
        'name' => 'Cocaudaotao',
        'path' => 'app/module/Cocaudaotao',
        'prefix'=> '/api/cocaudaotao',
    ]
];

$tk = $modules['taikhoan']['name'];
$mh = $modules['monhoc']['name'];
$lhp = $modules['lophocphan']['name'];
$dk = $modules['dangkyhocphan']['name'];
$kq = $modules['ketquahoctap']['name'];
$tt = $modules['tintuc']['name'];
$cc = $modules['cocaudaotao']['name'];
$kn = $modules['kiennghi']['name'];

return [
    // 1. Tài khoản
    'POST /api/taikhoan/dang-nhap'               => $tk . '/Dangnhap@handle',
    'POST /api/taikhoan/dang-xuat'               => $tk . '/Dangxuat@handle',
    'POST /api/taikhoan/doi-mat-khau'            => $tk . '/Doimatkhau@handle',
    'POST /api/taikhoan/quen-mat-khau'           => $tk . '/Quenmatkhau@handle',
    'GET /api/taikhoan/me'                       => $tk . '/Quanlytaikhoan@me',
    'GET /api/taikhoan/thong-ke'                 => $tk . '/Quanlytaikhoan@thongKe',
    'GET /api/taikhoan/danh-muc'                 => $tk . '/Quanlytaikhoan@danhMuc',
    'GET /api/taikhoan/users'                    => $tk . '/Quanlytaikhoan@index',
    'GET /api/taikhoan/user'                     => $tk . '/Quanlytaikhoan@show',
    'POST /api/taikhoan/users'                   => $tk . '/Quanlytaikhoan@store',
    'PUT /api/taikhoan/users'                    => $tk . '/Quanlytaikhoan@update',
    'POST /api/taikhoan/users/trang-thai'        => $tk . '/Quanlytaikhoan@changeStatus',
    'POST /api/taikhoan/users/dat-lai-mat-khau'  => $tk . '/Quanlytaikhoan@resetPassword',

    // 2. Môn học
    'GET /api/monhoc'                            => $mh . '/Quanlymonhoc@index',
    'GET /api/monhoc/chi-tiet'                   => $mh . '/Quanlymonhoc@show',
    'POST /api/monhoc'                           => $mh . '/Quanlymonhoc@store',
    'PUT /api/monhoc'                            => $mh . '/Quanlymonhoc@update',
    'DELETE /api/monhoc'                         => $mh . '/Quanlymonhoc@destroy',

    // 3. Lớp học phần
    'GET /api/lophocphan'                        => $lhp . '/Quanlylophocphan@index',
    'GET /api/lophocphan/chi-tiet'               => $lhp . '/Quanlylophocphan@show',
    'GET /api/lophocphan/nam-hoc'                => $lhp . '/Quanlylophocphan@namHoc',
    'GET /api/lophocphan/form-data'              => $lhp . '/Quanlylophocphan@formData',
    'POST /api/lophocphan/xem-truoc-lich'        => $lhp . '/Quanlylophocphan@preview',
    'POST /api/lophocphan'                       => $lhp . '/Quanlylophocphan@store',
    'PUT /api/lophocphan'                        => $lhp . '/Quanlylophocphan@update',
    'DELETE /api/lophocphan'                     => $lhp . '/Quanlylophocphan@destroy',

    // 4. Đăng ký học phần
    'GET /api/dangkyhocphan/available'           => $dk . '/Quanlydangky@available',
    'GET /api/dangkyhocphan/registered'          => $dk . '/Quanlydangky@registered',
    'POST /api/dangkyhocphan/register'           => $dk . '/Quanlydangky@register',
    'POST /api/dangkyhocphan/cancel'             => $dk . '/Quanlydangky@cancel',
    'GET /api/dangkyhocphan/thoi-khoa-bieu'      => $dk . '/Quanlydangky@thoiKhoaBieu',

    // 5. Kết quả học tập
    'GET /api/ketquahoctap/lop-giang-day'        => $kq . '/Quanlyketqua@lopGiangDay',
    'GET /api/ketquahoctap/buoi-hoc'             => $kq . '/Quanlyketqua@buoiHoc',
    'GET /api/ketquahoctap/diem-danh'            => $kq . '/Quanlyketqua@danhSachDiemDanh',
    'POST /api/ketquahoctap/diem-danh'           => $kq . '/Quanlyketqua@luuDiemDanh',
    'GET /api/ketquahoctap/bang-diem'            => $kq . '/Quanlyketqua@bangDiem',
    'POST /api/ketquahoctap/bang-diem'           => $kq . '/Quanlyketqua@luuBangDiem',
    'POST /api/ketquahoctap/diem-thanh-phan'     => $kq . '/Quanlyketqua@themDiem',
    'PUT /api/ketquahoctap/diem-thanh-phan'      => $kq . '/Quanlyketqua@suaDiem',
    'DELETE /api/ketquahoctap/diem-thanh-phan'   => $kq . '/Quanlyketqua@xoaDiem',
    'GET /api/ketquahoctap/ket-qua'              => $kq . '/Quanlyketqua@ketQua',

    // 6. Tin tức
    'GET /api/tintuc'                            => $tt . '/Quanlytintuc@index',
    'GET /api/tintuc/chi-tiet'                   => $tt . '/Quanlytintuc@show',
    'POST /api/tintuc'                           => $tt . '/Quanlytintuc@store',
    'PUT /api/tintuc'                            => $tt . '/Quanlytintuc@update',
    'POST /api/tintuc/trang-thai'                => $tt . '/Quanlytintuc@changeStatus',
    'DELETE /api/tintuc'                         => $tt . '/Quanlytintuc@destroy',

    // 8. Ý kiến & Kiến nghị
    'GET /api/kiennghi'                          => $kn . '/Quanlykiennghi@index',
    'GET /api/kiennghi/chi-tiet'                 => $kn . '/Quanlykiennghi@show',
    'POST /api/kiennghi'                         => $kn . '/Quanlykiennghi@store',
    'POST /api/kiennghi/phan-hoi'                => $kn . '/Quanlykiennghi@reply',
    'DELETE /api/kiennghi'                       => $kn . '/Quanlykiennghi@destroy',

    // 7. Cơ cấu đào tạo & chương trình đào tạo
    'GET /api/cocaudaotao/tong-quan'             => $cc . '/Quanlycocau@tongQuan',
    'GET /api/cocaudaotao/ds-ctdt'               => $cc . '/Quanlycocau@dsCtdt',
    'GET /api/cocaudaotao/khung-chuong-trinh'    => $cc . '/Quanlycocau@khungChuongTrinh',
    'POST /api/cocaudaotao/khoa'                 => $cc . '/Quanlycocau@luuKhoa',
    'PUT /api/cocaudaotao/khoa'                  => $cc . '/Quanlycocau@luuKhoa',
    'DELETE /api/cocaudaotao/khoa'               => $cc . '/Quanlycocau@xoaKhoa',
    'POST /api/cocaudaotao/chuyen-nganh'         => $cc . '/Quanlycocau@luuChuyenNganh',
    'PUT /api/cocaudaotao/chuyen-nganh'          => $cc . '/Quanlycocau@luuChuyenNganh',
    'DELETE /api/cocaudaotao/chuyen-nganh'       => $cc . '/Quanlycocau@xoaChuyenNganh',
    'POST /api/cocaudaotao/ctdt'                 => $cc . '/Quanlycocau@luuCtdt',
    'PUT /api/cocaudaotao/ctdt'                  => $cc . '/Quanlycocau@luuCtdt',
    'DELETE /api/cocaudaotao/ctdt'               => $cc . '/Quanlycocau@xoaCtdt',
    'POST /api/cocaudaotao/ctdt/mon'             => $cc . '/Quanlycocau@luuMonCtdt',
    'PUT /api/cocaudaotao/ctdt/mon'              => $cc . '/Quanlycocau@luuMonCtdt',
    'DELETE /api/cocaudaotao/ctdt/mon'           => $cc . '/Quanlycocau@xoaMonCtdt',
    'POST /api/cocaudaotao/nhom-tu-chon'         => $cc . '/Quanlycocau@luuNhom',
    'PUT /api/cocaudaotao/nhom-tu-chon'          => $cc . '/Quanlycocau@luuNhom',
    'DELETE /api/cocaudaotao/nhom-tu-chon'       => $cc . '/Quanlycocau@xoaNhom',
    'POST /api/cocaudaotao/nhom-tu-chon/mon'     => $cc . '/Quanlycocau@themMonNhom',
    'DELETE /api/cocaudaotao/nhom-tu-chon/mon'   => $cc . '/Quanlycocau@xoaMonNhom',
    'POST /api/cocaudaotao/hoc-ky'               => $cc . '/Quanlycocau@luuHocKy',
    'PUT /api/cocaudaotao/hoc-ky'                => $cc . '/Quanlycocau@luuHocKy',
    'DELETE /api/cocaudaotao/hoc-ky'             => $cc . '/Quanlycocau@xoaHocKy',
    'POST /api/cocaudaotao/lop-sinh-vien'        => $cc . '/Quanlycocau@luuLop',
    'PUT /api/cocaudaotao/lop-sinh-vien'         => $cc . '/Quanlycocau@luuLop',
    'DELETE /api/cocaudaotao/lop-sinh-vien'      => $cc . '/Quanlycocau@xoaLop',
];
