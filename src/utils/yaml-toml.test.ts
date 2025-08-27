import { promises as fs } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { detectFormatFromExtension, parseTOMLToJSON, parseYAMLToJSON } from './format-parsers';

describe('YAML and TOML Support', () => {
  const testYamlPath = '/tmp/test-config.yaml';
  const testTomlPath = '/tmp/test-config.toml';

  const testYamlContent = `
application:
  name: "test-app"
  version: "1.0.0"
  features:
    - name: "feature1"
      enabled: true
    - name: "feature2"
      enabled: false
database:
  host: "localhost"
  port: 5432
  enabled: true
`;

  const testTomlContent = `
[application]
name = "test-app"
version = "1.0.0"

[[application.features]]
name = "feature1"
enabled = true

[[application.features]]
name = "feature2"
enabled = false

[database]
host = "localhost"
port = 5432
enabled = true
`;

  beforeEach(async () => {
    await fs.writeFile(testYamlPath, testYamlContent);
    await fs.writeFile(testTomlPath, testTomlContent);
  });

  afterEach(async () => {
    try {
      await fs.unlink(testYamlPath);
      await fs.unlink(testTomlPath);
    } catch {
      // Files may not exist
    }
  });

  describe('detectFormatFromExtension', () => {
    it('should detect YAML files by extension', () => {
      expect(detectFormatFromExtension('config.yaml')).toBe('yaml');
      expect(detectFormatFromExtension('config.yml')).toBe('yaml');
      expect(detectFormatFromExtension('/path/to/config.yaml')).toBe('yaml');
    });

    it('should detect TOML files by extension', () => {
      expect(detectFormatFromExtension('config.toml')).toBe('toml');
      expect(detectFormatFromExtension('/path/to/config.toml')).toBe('toml');
    });
  });

  describe('parseYAMLToJSON', () => {
    it('should parse YAML files correctly', async () => {
      const result = await parseYAMLToJSON(testYamlPath);

      expect(result).toHaveProperty('application');
      expect((result as Record<string, unknown>).application).toEqual(
        expect.objectContaining({
          name: 'test-app',
          version: '1.0.0',
        })
      );
      expect((result as Record<string, unknown>).database).toEqual(
        expect.objectContaining({
          port: 5432,
          enabled: true,
        })
      );
    });

    it('should parse YAML arrays correctly', async () => {
      const result = await parseYAMLToJSON(testYamlPath);
      const app = (result as Record<string, unknown>).application as Record<string, unknown>;
      const features = app.features as Array<Record<string, unknown>>;

      expect(features).toHaveLength(2);
      expect(features[0].name).toBe('feature1');
      expect(features[0].enabled).toBe(true);
      expect(features[1].enabled).toBe(false);
    });

    it('should handle invalid YAML gracefully', async () => {
      const invalidYamlPath = '/tmp/invalid.yaml';
      await fs.writeFile(invalidYamlPath, 'invalid: yaml: content: [unclosed');

      await expect(parseYAMLToJSON(invalidYamlPath)).rejects.toThrow('YAML parsing error');

      await fs.unlink(invalidYamlPath);
    });
  });

  describe('parseTOMLToJSON', () => {
    it('should parse TOML files correctly', async () => {
      const result = await parseTOMLToJSON(testTomlPath);

      expect(result).toHaveProperty('application');
      expect((result as Record<string, unknown>).application).toEqual(
        expect.objectContaining({
          name: 'test-app',
          version: '1.0.0',
        })
      );
      expect((result as Record<string, unknown>).database).toEqual(
        expect.objectContaining({
          port: 5432,
          enabled: true,
        })
      );
    });

    it('should parse TOML arrays correctly', async () => {
      const result = await parseTOMLToJSON(testTomlPath);
      const app = (result as Record<string, unknown>).application as Record<string, unknown>;
      const features = app.features as Array<Record<string, unknown>>;

      expect(features).toHaveLength(2);
      expect(features[0].name).toBe('feature1');
      expect(features[0].enabled).toBe(true);
      expect(features[1].enabled).toBe(false);
    });

    it('should handle invalid TOML gracefully', async () => {
      const invalidTomlPath = '/tmp/invalid.toml';
      await fs.writeFile(invalidTomlPath, '[invalid toml content');

      await expect(parseTOMLToJSON(invalidTomlPath)).rejects.toThrow('TOML parsing error');

      await fs.unlink(invalidTomlPath);
    });
  });
});
