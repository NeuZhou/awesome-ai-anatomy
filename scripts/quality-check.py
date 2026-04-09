#!/usr/bin/env python
"""
Teardown Quality Check — run before every push.
Usage: python scripts/quality-check.py [project-dir]
Example: python scripts/quality-check.py openhands
"""
import sys
import os
import re

def check_emoji(content, filepath):
    """Check for emoji in markdown content."""
    emoji_pattern = re.compile(
        '[\U0001F300-\U0001F9FF\U00002702-\U000027B0'
        '\U0001FA00-\U0001FA6F\U0001FA70-\U0001FAFF'
        '\U00002600-\U000026FF\U0001F000-\U0001F02F\U00002B50]'
    )
    issues = []
    for i, line in enumerate(content.split('\n'), 1):
        matches = emoji_pattern.findall(line)
        if matches:
            issues.append(f"  L{i}: emoji found: {matches}")
    return issues

def check_ai_taste(content, filepath):
    """Check for AI-sounding phrases."""
    banned = [
        'genuinely', 'best-in-class', 'forward-looking', 'worth noting',
        'interestingly', 'surprised me', 'testament', 'seamlessly',
        'robust implementation', 'leveraging', 'arguably', 'staggering',
        'remarkably', 'impressively'
    ]
    banned_patterns = ["the most .* I've seen", "the most .* I've found", "the most .* I've read"]
    issues = []
    for i, line in enumerate(content.split('\n'), 1):
        line_lower = line.lower()
        for word in banned:
            if word.lower() in line_lower:
                issues.append(f"  L{i}: banned phrase '{word}': {line.strip()[:80]}")
        for pat in banned_patterns:
            if re.search(pat, line, re.IGNORECASE):
                issues.append(f"  L{i}: banned pattern '{pat}': {line.strip()[:80]}")
    return issues

def check_negative_language(content, filepath):
    """Check for harsh/negative language."""
    negative = [
        'garbage', 'rotting', 'dead weight', 'scam',
        'oversold', 'nightmare', 'ticking time bomb', 'insane',
        'physically recoil', 'screams', 'terrible',
        'spaghetti', 'Wild West', 'hope for the best'
    ]
    issues = []
    for i, line in enumerate(content.split('\n'), 1):
        # Skip code blocks
        if line.strip().startswith('```') or line.strip().startswith('|'):
            continue
        for phrase in negative:
            if phrase.lower() in line.lower():
                issues.append(f"  L{i}: negative phrase '{phrase}': {line.strip()[:80]}")
    return issues

def check_v2_sections(content, filepath):
    """Check V2 template section completeness."""
    required = [
        'TL;DR', 'Why Should You Care', 'At a Glance', 'Architecture',
        'Patterns You Can Steal', 'Source Reading Path',
        'Cross-Project Comparison', 'Key Takeaways', 'Verification Log'
    ]
    issues = []
    for section in required:
        if section.lower() not in content.lower():
            issues.append(f"  Missing section: {section}")
    return issues

def check_verification_log(content, filepath):
    """Check that verification log exists and has entries."""
    issues = []
    if 'Verification Log' not in content:
        issues.append("  No Verification Log found")
    elif 'Verified' not in content and 'verified' not in content:
        issues.append("  Verification Log has no verified entries")
    return issues

def main():
    if len(sys.argv) < 2:
        print("Usage: python scripts/quality-check.py [project-dir]")
        print("Example: python scripts/quality-check.py oh-my-codex")
        sys.exit(1)

    project = sys.argv[1]
    readme_path = os.path.join(project, 'README.md')
    if not os.path.exists(readme_path):
        readme_path = os.path.join(os.path.dirname(__file__), '..', project, 'README.md')

    if not os.path.exists(readme_path):
        print(f"ERROR: {readme_path} not found")
        sys.exit(1)

    with open(readme_path, 'r', encoding='utf-8') as f:
        content = f.read()

    checks = [
        ("Emoji Check", check_emoji),
        ("AI-Taste Check", check_ai_taste),
        ("Negative Language Check", check_negative_language),
        ("V2 Template Sections", check_v2_sections),
        ("Verification Log", check_verification_log),
    ]

    total_issues = 0
    for name, check_fn in checks:
        issues = check_fn(content, readme_path)
        if issues:
            print(f"FAIL: {name}")
            for issue in issues:
                print(issue)
            total_issues += len(issues)
        else:
            print(f"PASS: {name}")

    print(f"\n{'='*40}")
    if total_issues == 0:
        print("ALL CHECKS PASSED")
    else:
        print(f"FAILED: {total_issues} issues found")
    sys.exit(1 if total_issues > 0 else 0)

if __name__ == '__main__':
    main()
