import socket
import http.server
import socketserver
import os
import urllib.request
import urllib.parse
import sys
import threading
import time

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return '127.0.0.1'

def download_qr_code(url, filename):
    api_url = f"https://api.qrserver.com/v1/create-qr-code/?size=300x300&data={urllib.parse.quote(url)}"
    try:
        req = urllib.request.Request(
            api_url, 
            headers={'User-Agent': 'Mozilla/5.0'}
        )
        with urllib.request.urlopen(req, timeout=5) as response:
            with open(filename, 'wb') as f:
                f.write(response.read())
        return True
    except Exception:
        return False

class MyHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        # 压制日志输出，保持控制台整洁
        pass

def run_server(port=8000):
    handler = MyHandler
    socketserver.TCPServer.allow_reuse_address = True
    try:
        with socketserver.TCPServer(("0.0.0.0", port), handler) as httpd:
            print(f"共享服务器正在运行在端口 {port}...")
            httpd.serve_forever()
    except Exception as e:
        print(f"\n启动服务器失败: {e}")
        print(f"这通常是因为端口 {port} 已被占用。")

def main():
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    ip = get_local_ip()
    port = 8000
    share_url = f"http://{ip}:{port}/index.html"
    
    print("=" * 60)
    print("           ⚡ FitGuide 手机离线共享启动器 ⚡")
    print("=" * 60)
    print(f"\n1. 请确保您的手机和电脑连接在【同一个 WiFi】下。")
    print(f"2. 手机打开浏览器，输入以下网址进行访问：")
    print(f"   👉 {share_url}")
    print("\n------------------------------------------------------------")
    
    qr_filename = "手机扫码二维码.png"
    print("正在为您生成手机扫码二维码...")
    if download_qr_code(share_url, qr_filename):
        print(f"二维码已生成！正在尝试在电脑上打开它...")
        print(f"(如果没有自动打开，请手动双击打开项目文件夹中的: {qr_filename})")
        # 尝试用默认图片查看器打开二维码
        try:
            if sys.platform.startswith('win'):
                os.startfile(qr_filename)
            elif sys.platform.startswith('darwin'):
                os.system(f"open {qr_filename}")
            else:
                os.system(f"xdg-open {qr_filename}")
        except Exception:
            pass
    else:
        print("网络原因生成二维码失败，请直接在手机浏览器中输入上面的网址访问。")
        
    print("------------------------------------------------------------")
    print("\n🎯 手机首次访问成功后：")
    print("   1. 在手机浏览器中点击菜单，选择【添加到主屏幕】。")
    print("   2. 页面加载完成且添加成功后，手机会自动离线保存所有健身动作。")
    print("   3. 之后你可以关闭电脑本程序，手机在健身房断网也能直接使用！")
    print("\n------------------------------------------------------------")
    print("按 Ctrl+C 可以退出并关闭共享服务器。")
    print("=" * 60)
    
    # 在后台线程运行服务器，让主线程可以响应 Ctrl+C 退出
    server_thread = threading.Thread(target=run_server, args=(port,))
    server_thread.daemon = True
    server_thread.start()
    
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n正在关闭共享服务器，退出程序。")
        sys.exit(0)

if __name__ == "__main__":
    main()
