/// <reference path="./babel.d.ts" />

import tsPreset from "@babel/preset-typescript";
import solidPreset from "babel-preset-solid";
import { dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

type SolidPluginOptions = {
  generate?: "dom" | "ssr" | "universal";
  hydratable?: boolean;
  hmr?: boolean;
  sourceMaps?: boolean | "inline";
  debug?: boolean;
};

const rendererImportPattern = /(["'])solid-js\/web\1/g;
const pluginDir = dirname(fileURLToPath(import.meta.url));
const uiSrcDir = dirname(pluginDir);

function localImport(fromPath: string, target: string): string {
  let specifier = relative(dirname(fromPath), target).replaceAll("\\", "/");
  if (!specifier.startsWith(".")) specifier = `./${specifier}`;
  return specifier;
}

function refreshRuntimeImport(fromPath: string): string {
  return localImport(fromPath, `${pluginDir}/solid-refresh-runtime.ts`);
}

function splitPropsImport(fromPath: string): string {
  return localImport(fromPath, `${uiSrcDir}/utils/split-props.ts`);
}

function isSolidOneDependencyImport(importer: string): boolean {
  return importer.includes("/node_modules/@tanstack/solid-");
}

function upgradeRendererImports(code: string): string {
  return code.replace(rendererImportPattern, `"@solidjs/web"`);
}

function upgradeLucideImports(code: string, fromPath: string): string {
  return upgradeRendererImports(code).replace(
    /import\s+\{\s*splitProps\s*,\s*For\s*\}\s+from\s+["']solid-js["'];/g,
    `import { For } from "solid-js";\nimport { splitProps } from "${splitPropsImport(fromPath)}";`,
  );
}

const componentNamePattern = /^[A-Z][A-Za-z0-9_$]*$/;

type BabelApi = {
  types: any;
};

type BabelPath = {
  node: any;
  scope: {
    generateUidIdentifier(name: string): { name: string };
  };
  get(key: string): any;
  traverse(visitor: Record<string, unknown>): void;
};

function isComponentName(name: string | undefined): boolean {
  return !!name && componentNamePattern.test(name);
}

function stableSerialize(value: unknown): string {
  const seen = new WeakSet<object>();

  return (
    JSON.stringify(value, (key, nestedValue) => {
      if (
        key === "end" ||
        key === "extra" ||
        key === "leadingComments" ||
        key === "loc" ||
        key === "start" ||
        key === "trailingComments"
      ) {
        return undefined;
      }

      if (typeof nestedValue === "function") return undefined;

      if (nestedValue && typeof nestedValue === "object") {
        if (seen.has(nestedValue)) return undefined;
        seen.add(nestedValue);
      }

      return nestedValue;
    }) ?? ""
  );
}

function hashString(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function componentHash(node: unknown): string {
  return hashString(stableSerialize(node));
}

function createSolidHmrPlugin(runtimeImport: string, moduleId: string) {
  return ({ types: t }: BabelApi) => ({
    name: "xgx-solid-v2-hmr",
    visitor: {
      Program(path: BabelPath) {
        const body = path.node.body;
        const registryImport = path.scope.generateUidIdentifier("$$registry");
        const componentImport = path.scope.generateUidIdentifier("$$component");
        const registerImport = path.scope.generateUidIdentifier("$$register");
        const refreshImport = path.scope.generateUidIdentifier("$$refresh");
        const signalImport = path.scope.generateUidIdentifier("$$signal");
        const registry = path.scope.generateUidIdentifier("xgxSolidHmrRegistry");
        const nextBody: any[] = [];
        const assignments: any[] = [];
        const defaultExports: string[] = [];
        let hasComponents = false;
        let hasSignals = false;
        const importMeta = () => t.metaProperty(t.identifier("import"), t.identifier("meta"));
        const importMetaHot = () => t.memberExpression(importMeta(), t.identifier("hot"));
        const hotAcceptStatement = () =>
          t.ifStatement(
            importMetaHot(),
            t.blockStatement([
              t.expressionStatement(
                t.callExpression(t.memberExpression(importMetaHot(), t.identifier("accept")), []),
              ),
            ]),
          );

        const wrapCreateSignals = (componentPath: any) => {
          let signalIndex = 0;

          componentPath.traverse({
            CallExpression(callPath: any) {
              if (
                !t.isIdentifier(callPath.node.callee, {
                  name: "createSignal",
                })
              ) {
                return;
              }

              const [initialValue, options] = callPath.node.arguments;
              const args = [
                t.stringLiteral(String(signalIndex)),
                t.arrowFunctionExpression([], initialValue ?? t.identifier("undefined")),
              ];

              if (options) args.push(options);
              signalIndex += 1;
              hasSignals = true;
              callPath.replaceWith(t.callExpression(signalImport, args));
              callPath.skip();
            },
          });
        };

        const registerExpression = (name: string, hash: string) =>
          t.expressionStatement(
            t.assignmentExpression(
              "=",
              t.identifier(name),
              t.callExpression(componentImport, [
                registry,
                t.stringLiteral(`${moduleId}:${name}`),
                t.identifier(name),
                t.stringLiteral(hash),
              ]),
            ),
          );

        const statementPaths = path.get("body") as any[];
        const renderBindings = new Set<string>();

        for (const statement of body) {
          if (
            t.isImportDeclaration(statement) &&
            (statement.source.value === "@solidjs/web" || statement.source.value === "solid-js/web")
          ) {
            for (const specifier of statement.specifiers) {
              if (
                t.isImportSpecifier(specifier) &&
                t.isIdentifier(specifier.imported, { name: "render" })
              ) {
                renderBindings.add(specifier.local.name);
              }
            }
          }
        }

        let hasRootRender = false;
        if (renderBindings.size > 0) {
          path.traverse({
            CallExpression(callPath: any) {
              if (
                t.isIdentifier(callPath.node.callee) &&
                renderBindings.has(callPath.node.callee.name)
              ) {
                hasRootRender = true;
              }
            },
          });
        }

        for (let index = 0; index < body.length; index += 1) {
          const statement = body[index];
          const statementPath = statementPaths[index];

          if (
            t.isExportDefaultDeclaration(statement) &&
            t.isFunctionDeclaration(statement.declaration) &&
            isComponentName(statement.declaration.id?.name)
          ) {
            const name = statement.declaration.id.name;
            const hash = componentHash(statement.declaration);
            wrapCreateSignals(statementPath.get("declaration"));
            nextBody.push(statement.declaration);
            assignments.push(registerExpression(name, hash));
            defaultExports.push(name);
            hasComponents = true;
            continue;
          }

          if (t.isFunctionDeclaration(statement) && isComponentName(statement.id?.name)) {
            const hash = componentHash(statement);
            wrapCreateSignals(statementPath);
            nextBody.push(statement);
            assignments.push(registerExpression(statement.id.name, hash));
            hasComponents = true;
            continue;
          }

          if (
            t.isExportNamedDeclaration(statement) &&
            t.isFunctionDeclaration(statement.declaration) &&
            isComponentName(statement.declaration.id?.name)
          ) {
            const hash = componentHash(statement.declaration);
            wrapCreateSignals(statementPath.get("declaration"));
            nextBody.push(statement);
            assignments.push(registerExpression(statement.declaration.id.name, hash));
            hasComponents = true;
            continue;
          }

          if (
            t.isVariableDeclaration(statement) &&
            statement.kind === "const" &&
            statement.declarations.some(
              (declaration: any) =>
                t.isIdentifier(declaration.id) &&
                isComponentName(declaration.id.name) &&
                (t.isArrowFunctionExpression(declaration.init) ||
                  t.isFunctionExpression(declaration.init)),
            )
          ) {
            const declarationPaths = statementPath.get("declarations") as any[];
            nextBody.push({ ...statement, kind: "let" });
            for (
              let declarationIndex = 0;
              declarationIndex < statement.declarations.length;
              declarationIndex += 1
            ) {
              const declaration = statement.declarations[declarationIndex];
              if (t.isIdentifier(declaration.id) && isComponentName(declaration.id.name)) {
                const initPath = declarationPaths[declarationIndex].get("init");
                const hash = componentHash(declaration.init);
                wrapCreateSignals(initPath);
                assignments.push(registerExpression(declaration.id.name, hash));
                hasComponents = true;
              }
            }
            continue;
          }

          if (
            t.isExportNamedDeclaration(statement) &&
            t.isVariableDeclaration(statement.declaration) &&
            statement.declaration.kind === "const" &&
            statement.declaration.declarations.some(
              (declaration: any) =>
                t.isIdentifier(declaration.id) &&
                isComponentName(declaration.id.name) &&
                (t.isArrowFunctionExpression(declaration.init) ||
                  t.isFunctionExpression(declaration.init)),
            )
          ) {
            const declarationPath = statementPath.get("declaration") as any;
            const declarationPaths = declarationPath.get("declarations") as any[];
            nextBody.push({
              ...statement,
              declaration: { ...statement.declaration, kind: "let" },
            });
            for (
              let declarationIndex = 0;
              declarationIndex < statement.declaration.declarations.length;
              declarationIndex += 1
            ) {
              const declaration = statement.declaration.declarations[declarationIndex];
              if (t.isIdentifier(declaration.id) && isComponentName(declaration.id.name)) {
                const initPath = declarationPaths[declarationIndex].get("init");
                const hash = componentHash(declaration.init);
                wrapCreateSignals(initPath);
                assignments.push(registerExpression(declaration.id.name, hash));
                hasComponents = true;
              }
            }
            continue;
          }

          nextBody.push(statement);
        }

        if (!hasComponents) {
          if (hasRootRender) {
            nextBody.push(hotAcceptStatement());
            path.node.body = nextBody;
          }
          return;
        }

        const firstNonImportIndex = nextBody.findIndex(
          (statement) => !t.isImportDeclaration(statement),
        );
        const registryDeclaration = t.variableDeclaration("const", [
          t.variableDeclarator(registry, t.callExpression(registryImport, [])),
        ]);
        const insertIndex = firstNonImportIndex === -1 ? nextBody.length : firstNonImportIndex;

        nextBody.unshift(
          t.importDeclaration(
            [
              t.importSpecifier(registryImport, t.identifier("$$registry")),
              t.importSpecifier(componentImport, t.identifier("$$component")),
              t.importSpecifier(registerImport, t.identifier("$$register")),
              t.importSpecifier(refreshImport, t.identifier("$$refresh")),
              ...(hasSignals ? [t.importSpecifier(signalImport, t.identifier("$$signal"))] : []),
            ],
            t.stringLiteral(runtimeImport),
          ),
        );
        nextBody.splice(insertIndex + 1, 0, registryDeclaration);
        nextBody.push(...assignments);
        nextBody.push(
          ...defaultExports.map((name) =>
            t.exportNamedDeclaration(null, [
              t.exportSpecifier(t.identifier(name), t.identifier("default")),
            ]),
          ),
        );
        nextBody.push(
          t.ifStatement(
            importMetaHot(),
            t.blockStatement([
              t.expressionStatement(
                t.callExpression(registerImport, [
                  t.memberExpression(importMetaHot(), t.identifier("data")),
                  registry,
                ]),
              ),
              t.expressionStatement(
                t.callExpression(t.memberExpression(importMetaHot(), t.identifier("accept")), [
                  t.stringLiteral(runtimeImport),
                  t.arrowFunctionExpression([t.identifier("nextRuntime")], t.blockStatement([])),
                ]),
              ),
              t.expressionStatement(
                t.callExpression(t.memberExpression(importMetaHot(), t.identifier("accept")), [
                  t.arrowFunctionExpression(
                    [t.identifier("nextModule")],
                    t.callExpression(refreshImport, [
                      t.memberExpression(importMetaHot(), t.identifier("data")),
                      t.identifier("nextModule"),
                    ]),
                  ),
                ]),
              ),
            ]),
          ),
        );

        path.node.body = nextBody;
      },
    },
  });
}

function shouldApplyHmr(path: string, enabled: boolean): boolean {
  return (
    enabled &&
    !path.includes("/node_modules/") &&
    !path.includes("/src/bun-plugins/solid-refresh-runtime") &&
    !path.endsWith(".d.ts")
  );
}

export function SolidPlugin(options: SolidPluginOptions = {}): Bun.BunPlugin {
  const {
    generate = "dom",
    hmr = true,
    hydratable = false,
    sourceMaps = "inline",
    debug = false,
  } = options;

  return {
    name: "xgx-solid-v2",
    setup(build) {
      let babel: typeof import("@babel/core") | undefined;
      const dependencyRuntimePath = `${pluginDir}/solid-dependency-runtime.ts`;

      build.onResolve({ filter: /^solid-js(?:\/store)?$/ }, (args) => {
        if (!isSolidOneDependencyImport(args.importer)) return;
        return { path: dependencyRuntimePath };
      });

      build.onLoad({ filter: /node_modules\/lucide-solid\/.*\.js$/ }, async ({ path }) => ({
        contents: upgradeLucideImports(await Bun.file(path).text(), path),
        loader: "js",
      }));

      build.onLoad({ filter: /\.(?:ts|tsx|jsx)$/ }, async ({ path }) => {
        babel ??= await import("@babel/core");

        const result = await babel.transformFileAsync(path, {
          compact: false,
          filename: path,
          plugins: shouldApplyHmr(path, hmr && generate === "dom")
            ? [createSolidHmrPlugin(refreshRuntimeImport(path), path)]
            : [],
          presets: [
            [tsPreset, {}],
            [solidPreset, { generate, hydratable }],
          ],
          sourceMaps,
        });

        if (!result?.code) {
          if (debug) console.warn(`[xgx-solid-v2] No code for ${path}`);
          return;
        }

        let code = result.code;

        return {
          contents: upgradeRendererImports(code),
          loader: "js",
        };
      });
    },
  };
}

export default SolidPlugin();
