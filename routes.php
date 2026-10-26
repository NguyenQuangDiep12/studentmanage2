
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
        'prefix' => '/api/dangkyhocphan',
    ],

    'ketquahoctap' => [
        'name' => 'Ketquahoctap',
        'path' => 'app/module/Ketquahoctap',
        'prefix' => '/api/ketquahoctap',
    ],

    'tintuc' => [
        'name' => 'Tintuc',
        'path' => 'app/module/Tintuc',
        'prefix' => '/api/tintuc',
    ],

    'kiennghi' => [
        'name' => 'Kiennghi',
        'path' => 'app/module/Kiennghi',
        'prefix' => '/api/kiennghi',
    ],

    'cocaudaotao' => [
        'name' => 'Cocaudaotao',
        'path' => 'app/module/Cocaudaotao',
        'prefix' => '/api/cocaudaotao',
    ],
];

return [
    // Tài khoản
    'POST /api/taikhoan/dang-nhap'
        => 'Taikhoan/Dangnhap@handle',

    'POST /api/taikhoan/dang-xuat'
        => 'Taikhoan/Dangxuat@handle',

    'POST /api/taikhoan/doi-mat-khau'
        => 'Taikhoan/Doimatkhau@handle',

    'GET /api/monhoc'
        => 'Monhoc/Quanlymonhoc@index',

    'POST /api/monhoc'
        => 'Monhoc/Quanlymonhoc@store',

    'GET /api/lophocphan'
        => 'Lophocphan/Quanlylophocphan@index',

    'POST /api/lophocphan'
        => 'Lophocphan/Quanlylophocphan@store',
];