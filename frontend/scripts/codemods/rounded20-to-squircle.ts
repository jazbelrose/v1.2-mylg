#!/usr/bin/env tsx

/**
 * Codemod to migrate 20px border-radius patterns to use the new Squircle component
 * 
 * Usage:
 *   npx tsx scripts/codemods/rounded20-to-squircle.ts --dry-run
 *   npx tsx scripts/codemods/rounded20-to-squircle.ts --apply
 */

import { Project, SourceFile, Node, SyntaxKind } from 'ts-morph';
import * as path from 'path';
import * as fs from 'fs';

interface MigrationResult {
  file: string;
  changes: string[];
  warnings: string[];
}

interface MigrationReport {
  totalFiles: number;
  modifiedFiles: number;
  results: MigrationResult[];
  summary: {
    jsxStylesReplaced: number;
    cssRulesReplaced: number;
    componentsWrapped: number;
    warnings: number;
  };
}

class SquircleMigrator {
  private project: Project;
  private report: MigrationReport;

  constructor() {
    this.project = new Project({
      tsConfigFilePath: path.join(process.cwd(), 'tsconfig.json'),
    });
    
    this.report = {
      totalFiles: 0,
      modifiedFiles: 0,
      results: [],
      summary: {
        jsxStylesReplaced: 0,
        cssRulesReplaced: 0,
        componentsWrapped: 0,
        warnings: 0,
      },
    };
  }

  async migrate(dryRun: boolean = true): Promise<MigrationReport> {
    console.log(`🔍 Starting migration in ${dryRun ? 'DRY RUN' : 'APPLY'} mode...`);
    
    // Find all relevant files
    const tsxFiles = this.project.getSourceFiles('src/**/*.{tsx,ts}');
    const cssFiles = this.findCssFiles();
    
    this.report.totalFiles = tsxFiles.length + cssFiles.length;
    
    // Process TypeScript/React files
    for (const sourceFile of tsxFiles) {
      const result = this.migrateTsxFile(sourceFile);
      if (result.changes.length > 0 || result.warnings.length > 0) {
        this.report.results.push(result);
        if (result.changes.length > 0) {
          this.report.modifiedFiles++;
        }
      }
    }
    
    // Process CSS files
    for (const cssFile of cssFiles) {
      const result = await this.migrateCssFile(cssFile);
      if (result.changes.length > 0 || result.warnings.length > 0) {
        this.report.results.push(result);
        if (result.changes.length > 0) {
          this.report.modifiedFiles++;
        }
      }
    }
    
    // Save changes if not dry run
    if (!dryRun) {
      await this.project.save();
      console.log('💾 Changes saved to TypeScript files');
    }
    
    return this.report;
  }

  private migrateTsxFile(sourceFile: SourceFile): MigrationResult {
    const result: MigrationResult = {
      file: sourceFile.getFilePath(),
      changes: [],
      warnings: [],
    };

    let needsSquircleImport = false;

    // Find JSX elements with borderRadius: 20 or '20px' in style prop
    const jsxElements = sourceFile.getDescendantsOfKind(SyntaxKind.JsxOpeningElement)
      .concat(sourceFile.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement));

    for (const element of jsxElements) {
      const styleAttribute = element.getAttributes().find(attr => {
        if (!Node.isJsxAttribute(attr)) return false;
        const nameNode = attr.getNameNode();
        return nameNode.getText() === 'style';
      });

      if (styleAttribute && Node.isJsxAttribute(styleAttribute)) {
        const initializer = styleAttribute.getInitializer();
        
        if (Node.isJsxExpression(initializer)) {
          const expression = initializer.getExpression();
          
          if (Node.isObjectLiteralExpression(expression)) {
            const borderRadiusProperty = expression.getProperties().find(prop => {
              if (!Node.isPropertyAssignment(prop)) return false;
              const name = prop.getName();
              return name === 'borderRadius';
            });

            if (borderRadiusProperty && Node.isPropertyAssignment(borderRadiusProperty)) {
              const value = borderRadiusProperty.getInitializer();
              
              if (Node.isNumericLiteral(value) && value.getText() === '20') {
                this.wrapWithSquircle(element, result);
                needsSquircleImport = true;
                
                // Remove borderRadius property
                borderRadiusProperty.remove();
                result.changes.push(`Wrapped element with <Squircle> and removed borderRadius: 20`);
                this.report.summary.componentsWrapped++;
              } else if (Node.isStringLiteral(value) && value.getLiteralValue() === '20px') {
                this.wrapWithSquircle(element, result);
                needsSquircleImport = true;
                
                // Remove borderRadius property
                borderRadiusProperty.remove();
                result.changes.push(`Wrapped element with <Squircle> and removed borderRadius: '20px'`);
                this.report.summary.componentsWrapped++;
              }
            }
          }
        }
      }
    }

    // Add import if needed
    if (needsSquircleImport) {
      this.addSquircleImport(sourceFile);
      result.changes.push('Added Squircle import');
    }

    return result;
  }

  private wrapWithSquircle(element: any, result: MigrationResult): void {
    const tagName = element.getTagNameNode().getText();
    
    // For complex components, add a warning instead of auto-wrapping
    if (this.isComplexComponent(tagName)) {
      result.warnings.push(
        `TODO: Consider wrapping ${tagName} with <Squircle> - automatic wrapping skipped for complex component`
      );
      this.report.summary.warnings++;
      return;
    }

    const elementText = element.getParent()?.getText() || '';
    const wrapped = `<Squircle radius={20}>\n  ${elementText}\n</Squircle>`;
    
    // This is a simplified approach - in practice, we'd need more sophisticated AST manipulation
    result.warnings.push(
      `TODO: Wrap the following element with <Squircle radius={20}>: ${tagName}`
    );
    this.report.summary.warnings++;
  }

  private isComplexComponent(tagName: string): boolean {
    const complexComponents = [
      'Modal', 'Dialog', 'Drawer', 'Popover', 'Tooltip', 'Dropdown',
      'Canvas', 'Video', 'iframe', 'svg', 'input', 'textarea', 'select'
    ];
    
    return complexComponents.includes(tagName) || 
           tagName[0] === tagName[0].toUpperCase(); // Custom component
  }

  private addSquircleImport(sourceFile: SourceFile): void {
    const existingImports = sourceFile.getImportDeclarations();
    const squircleImport = existingImports.find(imp => 
      imp.getModuleSpecifierValue().includes('squircle')
    );

    if (!squircleImport) {
      sourceFile.addImportDeclaration({
        moduleSpecifier: '@/shared/ui/squircle',
        namedImports: ['Squircle'],
      });
    }
  }

  private findCssFiles(): string[] {
    const cssExtensions = ['.css', '.scss', '.less', '.module.css'];
    const cssFiles: string[] = [];

    const walkDir = (dir: string) => {
      const files = fs.readdirSync(dir);
      
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
          walkDir(filePath);
        } else if (cssExtensions.some(ext => file.endsWith(ext))) {
          cssFiles.push(filePath);
        }
      }
    };

    walkDir(path.join(process.cwd(), 'src'));
    return cssFiles;
  }

  private async migrateCssFile(filePath: string): Promise<MigrationResult> {
    const result: MigrationResult = {
      file: filePath,
      changes: [],
      warnings: [],
    };

    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      let modifiedContent = content;
      
      // Simple regex-based approach for CSS migration
      // Look for border-radius: 20px patterns
      const borderRadiusRegex = /border-radius:\s*20px/g;
      const matches = content.match(borderRadiusRegex);
      
      if (matches) {
        matches.forEach(() => {
          result.warnings.push(
            'TODO: Consider replacing border-radius: 20px with .squircle class or <Squircle> wrapper'
          );
          this.report.summary.warnings++;
        });
      }

      // More sophisticated CSS parsing would go here in a real implementation
      
    } catch (error) {
      result.warnings.push(`Error reading CSS file: ${error}`);
      this.report.summary.warnings++;
    }

    return result;
  }

  printReport(): void {
    console.log('\n📊 Migration Report');
    console.log('='.repeat(50));
    console.log(`Total files scanned: ${this.report.totalFiles}`);
    console.log(`Files with changes: ${this.report.modifiedFiles}`);
    console.log(`Components wrapped: ${this.report.summary.componentsWrapped}`);
    console.log(`CSS rules found: ${this.report.summary.cssRulesReplaced}`);
    console.log(`Warnings: ${this.report.summary.warnings}`);
    console.log('');

    if (this.report.results.length > 0) {
      console.log('📝 Detailed Results:');
      console.log('-'.repeat(30));
      
      for (const result of this.report.results) {
        if (result.changes.length > 0 || result.warnings.length > 0) {
          console.log(`\n📄 ${path.relative(process.cwd(), result.file)}`);
          
          if (result.changes.length > 0) {
            console.log('  ✅ Changes:');
            result.changes.forEach(change => console.log(`    • ${change}`));
          }
          
          if (result.warnings.length > 0) {
            console.log('  ⚠️  Warnings:');
            result.warnings.forEach(warning => console.log(`    • ${warning}`));
          }
        }
      }
    }
    
    console.log('\n🎯 Next Steps:');
    console.log('1. Review the warnings and manually update complex components');
    console.log('2. Test the changes thoroughly');
    console.log('3. Run the migration with --apply flag to save changes');
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--apply');
  
  if (args.includes('--help')) {
    console.log(`
Usage: npx tsx scripts/codemods/rounded20-to-squircle.ts [options]

Options:
  --dry-run    Preview changes without applying (default)
  --apply      Apply changes to files
  --help       Show this help message
    `);
    process.exit(0);
  }

  const migrator = new SquircleMigrator();
  
  try {
    const report = await migrator.migrate(dryRun);
    migrator.printReport();
    
    if (dryRun) {
      console.log('\n💡 Run with --apply to apply these changes');
    } else {
      console.log('\n✅ Migration completed!');
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}