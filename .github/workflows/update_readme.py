import requests

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

# Generate Markdown content
starred_md = "\n".join(
    [f"- [{repo['name']}]({repo['html_url']}) - ⭐ {repo['stargazers_count']}" for repo in top_starred]
)
forked_md = "\n".join(
    [f"- [{repo['name']}]({repo['html_url']}) - 🍴 {repo['forks_count']}" for repo in top_forked]
)

# Read existing README
with open("README.md", "r") as f:
    readme_content = f.read()

# Replace placeholders in README
new_readme_content = readme_content
new_readme_content = new_readme_content.replace(
    "<!-- TOP_STARRED_REPOS_START -->\nLoading...\n<!-- TOP_STARRED_REPOS_END -->",
    f"<!-- TOP_STARRED_REPOS_START -->\n{starred_md}\n<!-- TOP_STARRED_REPOS_END -->"
)
new_readme_content = new_readme_content.replace(
    "<!-- TOP_FORKED_REPOS_START -->\nLoading...\n<!-- TOP_FORKED_REPOS_END -->",
    f"<!-- TOP_FORKED_REPOS_START -->\n{forked_md}\n<!-- TOP_FORKED_REPOS_END -->"
)

# Write updated README
with open("README.md", "w") as f:
    f.write(new_readme_content)

print("README.md updated successfully!")
