#!/usr/bin/env python3
import subprocess
import sys
import os

def test_no_color_option():
    """Test --no-color CLI option"""
    try:
        json_data = '{"name": "test", "value": 42}'
        
        # Test 1: With --no-color option
        print("Test 1: Testing --no-color option")
        env1 = os.environ.copy()
        # Don't set NO_COLOR to test the CLI option
        if 'NO_COLOR' in env1:
            del env1['NO_COLOR']
        
        # Use --no-color option with expression (non-interactive mode)
        result1 = subprocess.run(
            ['node', 'dist/index.js', '--no-color', '$.name'],
            input=json_data,
            capture_output=True,
            text=True,
            env=env1
        )
        
        if result1.returncode == 0:
            print(f"✓ Command executed successfully")
            print(f"Output: {repr(result1.stdout.strip())}")
            
            # Check that output doesn't contain ANSI escape codes
            if '\x1b[' not in result1.stdout:
                print("✓ Output has no color codes with --no-color option")
            else:
                print("✗ Found color codes in output despite --no-color option")
                return False
        else:
            print(f"✗ Command failed: {result1.stderr}")
            return False
        
        # Test 2: With NO_COLOR environment variable
        print("\nTest 2: Testing NO_COLOR environment variable")
        env2 = os.environ.copy()
        env2['NO_COLOR'] = '1'
        
        result2 = subprocess.run(
            ['node', 'dist/index.js', '$.name'],
            input=json_data,
            capture_output=True,
            text=True,
            env=env2
        )
        
        if result2.returncode == 0:
            print(f"✓ Command executed successfully")
            print(f"Output: {repr(result2.stdout.strip())}")
            
            # Check that output doesn't contain ANSI escape codes
            if '\x1b[' not in result2.stdout:
                print("✓ Output has no color codes with NO_COLOR env var")
            else:
                print("✗ Found color codes in output despite NO_COLOR env var")
                return False
        else:
            print(f"✗ Command failed: {result2.stderr}")
            return False
        
        # Test 3: Default behavior (may have colors if output is to TTY)
        print("\nTest 3: Testing default behavior (no --no-color, no NO_COLOR)")
        env3 = os.environ.copy()
        if 'NO_COLOR' in env3:
            del env3['NO_COLOR']
        
        result3 = subprocess.run(
            ['node', 'dist/index.js', '$.name'],
            input=json_data,
            capture_output=True,
            text=True,
            env=env3
        )
        
        if result3.returncode == 0:
            print(f"✓ Command executed successfully")
            print(f"Output: {repr(result3.stdout.strip())}")
            # Note: In subprocess with capture_output=True, stdout is not a TTY
            # so colors should be disabled by default
            if '\x1b[' not in result3.stdout:
                print("✓ Output has no color codes (expected: not a TTY)")
            else:
                print("! Found color codes (may be expected if forcing colors)")
        else:
            print(f"✗ Command failed: {result3.stderr}")
            return False
        
        print("\n✓ All tests passed!")
        return True
        
    except Exception as e:
        print(f"\n✗ Test failed: {str(e)}")
        return False

if __name__ == '__main__':
    success = test_no_color_option()
    sys.exit(0 if success else 1)