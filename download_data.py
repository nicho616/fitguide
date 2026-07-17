import urllib.request
import json
import os
import sys

def download_file(url, output_path):
    print(f"尝试从 {url} 下载数据...")
    try:
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'}
        )
        with urllib.request.urlopen(req, timeout=30) as response:
            data = response.read()
            # 校验是否是有效的 JSON
            json_data = json.loads(data.decode('utf-8'))
            print(f"下载成功！数据项总数: {len(json_data)}")
            
            with open(output_path, 'w', encoding='utf-8') as f:
                json.dump(json_data, f, ensure_ascii=False, indent=2)
            print(f"数据已成功写入本地: {output_path}")
            return True
    except Exception as e:
        print(f"从 {url} 下载失败: {e}")
        return False

def main():
    target_dir = os.path.dirname(os.path.abspath(__file__))
    output_path = os.path.join(target_dir, "exercises.json")
    
    # 尝试不同分支的 URL
    urls = [
        "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/data/exercises.json",
        "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/master/data/exercises.json"
    ]
    
    success = False
    for url in urls:
        if download_file(url, output_path):
            success = True
            break
            
    if not success:
        print("所有下载尝试均已失败。请检查网络或 GitHub 仓库地址。")
        sys.exit(1)
    else:
        print("数据下载与验证任务全部完成！")

if __name__ == "__main__":
    main()
