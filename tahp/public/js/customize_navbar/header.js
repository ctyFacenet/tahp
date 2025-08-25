// Override navbar
frappe.provide('frappe.ui');

// frappe.ui.Navbar = class CustomNavbar extends frappe.ui.Navbar {
//     make() {
//         super.make();
//         this.customize_navbar();
//     }
    
//     customize_navbar() {
//         // Xóa navbar cũ
//         this.$wrapper.empty();
        
//         // Tạo navbar mới
//         this.$wrapper.html(`
//             <nav class="navbar navbar-expand-lg custom-navbar">
//                 <div class="container-fluid">
//                     <a class="navbar-brand" href="/">
//                         <img src="/assets/tahp/images/logo.png" alt="Logo" height="30">
//                         <p> hello</p>
//                     </a>
                    
//                     <div class="navbar-nav ms-auto">
//                         <div class="nav-item dropdown">
//                             <a class="nav-link dropdown-toggle" href="#" role="button" data-bs-toggle="dropdown">
//                                 ${frappe.session.user_fullname}
//                             </a>
//                             <ul class="dropdown-menu">
//                                 <li><a class="dropdown-item" href="/app/user-profile">Profile</a></li>
//                                 <li><a class="dropdown-item" onclick="frappe.app.logout()">Logout</a></li>
//                             </ul>
//                         </div>
//                     </div>
//                 </div>
//             </nav>
//         `);
        
//         this.setup_custom_events();
//     }
    
//     setup_custom_events() {
//         // Thêm các event handler tùy chỉnh
//         this.$wrapper.find('.custom-menu-item').on('click', function(e) {
//             e.preventDefault();
//             // Xử lý click menu
//         });
//     }
// };

// Override khi frappe ready
// $(document).ready(function() {
//     // Tìm phần tử có class .nvabar
//     $(".navbar")
//         .empty() // Xóa sạch nội dung bên trong
//         .append('<div style="background-color: blue; width: 100%; height: 50px;"></div>'); // Thêm div màu xanh nước biển
// });