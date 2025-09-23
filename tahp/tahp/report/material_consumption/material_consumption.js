// Copyright (c) 2025, FaceNet and contributors
// For license information, please see license.txt

frappe.query_reports["Material Consumption"] = {
    "filters": [],
    
    onload: function() {
        console.log('=== Chart.js Test ===');
        
        if (typeof Chart !== 'undefined') {
            console.log('✅ Chart.js loaded successfully!');
            frappe.show_alert({
                message: `Chart.js v${Chart.version} loaded successfully!`,
                indicator: 'green'
            });

            // Gọi hàm để kiểm tra và tạo biểu đồ
            this.checkAndCreateChart();
            
        } else {
            console.log('❌ Chart.js not loaded');
        }
    },
    
    // Hàm này sẽ kiểm tra liên tục cho đến khi container chính của báo cáo sẵn sàng
    checkAndCreateChart: function() {
        let container = $('.layout-main-section').first();
        
        if (container.length > 0) {
            console.log('✅ Container found, creating chart...');
            this.create_stacked_bar_chart();
        } else {
            console.log('🔄 Container not ready, waiting...');
            // Đặt một độ trễ nhỏ và thử lại
            setTimeout(() => {
                this.checkAndCreateChart();
            }, 100);
        }
    },
    
    create_stacked_bar_chart: function() {
        console.log('=== create_stacked_bar_chart called ===');
        
        // Xóa các biểu đồ cũ để tránh trùng lặp
        $('.chart-container').remove();
        
        let container = $('.layout-main-section').first();
        
        if (container.length === 0) {
            console.error('Container not found, cannot create chart.');
            return;
        }

        let chart_html = `
            <div class="chart-container" style="
                background: white; 
                padding: 20px; 
                margin: 20px 0; 
                border-radius: 8px; 
                min-height: 400px;
                width: 100%;
            ">
                <h4 style="margin-bottom: 15px; color: #52914dff; text-align: center;">
                    📊 Biểu đồ Tiêu thụ Vật liệu
                </h4>
                <div style="position: relative; height: 300px; width: 100%;">
                    <canvas id="stacked-bar-chart-canvas"></canvas>
                </div>
            </div>
        `;
        
        container.prepend(chart_html);
        
        // Dùng setTimeout để chắc chắn canvas đã được thêm vào DOM
        setTimeout(() => {
            const canvas = document.getElementById('stacked-bar-chart-canvas');
            if (canvas) {
                const ctx = canvas.getContext('2d');
                
                const data = {
                    labels: ['Sản Phẩm A', 'Sản Phẩm B', 'Sản Phẩm C'],
                    datasets: [
                        {
                            label: 'Nguyên liệu X',
                            data: [120, 150, 100],
                            backgroundColor: '#36A2EB',
                            stack: 'Stack 0',
                            barThickness: 50,
                        },
                        {
                            label: 'Nguyên liệu Y',
                            data: [80, 100, 140],
                            backgroundColor: '#FF6384',
                            stack: 'Stack 0',
                            barThickness: 50,
                        },
                        {
                            label: 'Nguyên liệu Z',
                            data: [50, 70, 60],
                            backgroundColor: '#FFCE56',
                            stack: 'Stack 0',
                            barThickness: 50,
                        },
                    ]
                };
                
                new Chart(ctx, {
                    type: 'bar',
                    data: data,
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            title: {
                                display: true,
                                text: 'Tiêu thụ Vật liệu theo Sản Phẩm',
                                font: {
                                    size: 16
                                }
                            },
                        },
                        scales: {
                            x: {
                                stacked: true,
                                title: {
                                    display: true,
                                    text: 'Sản Phẩm'
                                }
                            },
                            y: {
                                stacked: true,
                                title: {
                                    display: true,
                                    text: 'Số Lượng Tiêu Thụ'
                                }
                            }
                        }
                    }
                });
                
                console.log('✅ Stacked Bar Chart created successfully!');
                frappe.show_alert('Stacked Bar Chart created in report!');
            } else {
                console.error('Canvas element not found after timeout.');
            }
        }, 100);
    },
};
