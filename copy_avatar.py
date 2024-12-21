import os
import shutil

# 获取用户桌面路径
desktop_path = os.path.join(os.path.expanduser('~'), 'Desktop')
avatar_source = os.path.join(desktop_path, 'avatar.png')

# 目标路径
project_path = os.path.dirname(os.path.abspath(__file__))
assets_dir = os.path.join(project_path, 'assets')
avatar_dest = os.path.join(assets_dir, 'avatar.png')

# 确保目标目录存在
os.makedirs(assets_dir, exist_ok=True)

# 复制文件
try:
    shutil.copy2(avatar_source, avatar_dest)
    print(f"头像已成功复制到 {avatar_dest}")
except FileNotFoundError:
    print(f"错误：未在桌面找到 avatar.png")
except Exception as e:
    print(f"复制过程中发生错误：{e}")
