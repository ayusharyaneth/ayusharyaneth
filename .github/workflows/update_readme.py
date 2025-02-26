import requests
import os

# GitHub username
USERNAME = "ayusharyaneth"  # Replace with your GitHub username

# GitHub API URL
API_URL = f"https://api.github.com/users/{USERNAME}/repos?per_page=100"

# Fetch repos
response = requests.get(API_URL)
repos = response.json()

if isinstance(repos, dict) and "message" in repos:
    print("Error:", repos["message"])
    exit()

# Sort repositories by stars and forks
top_starred = sorted(repos, key=lambda x: x["stargazers_count"], reverse=True)[:5]
top_forked = sorted(repos, key=lambda x: x["forks_count"], reverse=True)[:5]

# Generate Markdown
md_content = f"# {USERNAME}'s GitHub Stats\n\n"
md_content += "## Top Starred Repositories ⭐\n"
for repo in top_starred:
    md_content += f"- [{repo['name']}]({repo['html_url']}) - ⭐ {repo['stargazers_count']}\n"

md_content += "\n## Top Forked Repositories 🍴\n"
for repo in top_forked:
    md_content += f"- [{repo['name']}]({repo['html_url']}) - 🍴 {repo['forks_count']}\n"

# Update README
with open("README.md", "w") as f:
    f.write(md_content)

print("README.md updated successfully!")
