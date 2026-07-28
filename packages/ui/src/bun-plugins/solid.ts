/// <reference path="./babel.d.ts" />

import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import tsPreset from "@babel/preset-typescript";
import solidPreset from "babel-preset-solid";

type SolidPluginOptions = {
  generate?: "dom" | "ssr" | "universal";
  hydratable?: boolean;
  hmr?: boolean;
  sourceMaps?: boolean | "inline";
  debug?: boolean;
};

const rendererImportPattern = /(["'])solid-js\/web\1/g;
const pluginDir = dirname(fileURLToPath(import.meta.url));

function localImport(fromPath: string, target: string): string {
  let specifier = relative(dirname(fromPath), target).replaceAll("\\", "/");
  if (!specifier.startsWith(".")) specifier = `./${specifier}`;
  return specifier;
}

function refreshRuntimeImport(fromPath: string): string {
  return localImport(fromPath, `${pluginDir}/solid-refresh-runtime.ts`);
}

function packageRoot(specifier: string): string {
  return dirname(Bun.resolveSync(`${specifier}/package.json`, process.cwd()));
}

function solidRuntimeEntrypoints(development: boolean): Record<string, string> {
  const solidRoot = packageRoot("solid-js");
  const solidWebRoot = packageRoot("@solidjs/web");
  const signalsRoot = dirname(Bun.resolveSync("@solidjs/signals/package.json", solidRoot));

  return {
    "@solidjs/signals": join(signalsRoot, development ? "dist/dev.js" : "dist/prod/index.js"),
    "@solidjs/web": join(solidWebRoot, development ? "dist/dev.js" : "dist/web.js"),
    "solid-js": join(solidRoot, development ? "dist/dev.js" : "dist/solid.js"),
  };
}

function upgradeRendererImports(code: string): string {
  return code.replace(rendererImportPattern, `"@solidjs/web"`);
}

function upgradeLucideImports(code: string): string {
  // lucide-solid is still compiled against Solid 1. Remove this transform once it publishes Solid 2 output.
  return upgradeRendererImports(code)
    .replace(
      /import\s+\{\s*splitProps\s*,\s*For\s*\}\s+from\s+["']solid-js["'];/g,
      'import { For, omit } from "solid-js";',
    )
    .replace(
      /const\s+\[([A-Za-z_$][\w$]*),\s*([A-Za-z_$][\w$]*)\]\s*=\s*splitProps\(([^,\n]+),\s*\[([^\]]*)\]\);/g,
      (_match, local, rest, props, keys) =>
        `const ${local} = ${props};\nconst ${rest} = omit(${props}, ${keys});`,
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
        const rootImport = path.scope.generateUidIdentifier("$$root");
        const disposeRootImport = path.scope.generateUidIdentifier("$$disposeRoot");
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
        const disposeRootStatement = () =>
          t.ifStatement(
            importMetaHot(),
            t.blockStatement([
              t.expressionStatement(
                t.callExpression(disposeRootImport, [t.stringLiteral(moduleId)]),
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
                // Hand the dispose handle to the refresh runtime so the next
                // evaluation of this module can tear the previous root down.
                callPath.replaceWith(
                  t.callExpression(rootImport, [t.stringLiteral(moduleId), callPath.node]),
                );
                callPath.skip();
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

        const rootImportSpecifiers = hasRootRender
          ? [
              t.importSpecifier(rootImport, t.identifier("$$root")),
              t.importSpecifier(disposeRootImport, t.identifier("$$disposeRoot")),
            ]
          : [];

        if (!hasComponents) {
          if (hasRootRender) {
            const rootOnlyFirstNonImport = nextBody.findIndex(
              (statement) => !t.isImportDeclaration(statement),
            );

            nextBody.unshift(
              t.importDeclaration(rootImportSpecifiers, t.stringLiteral(runtimeImport)),
            );
            nextBody.splice(
              rootOnlyFirstNonImport === -1 ? nextBody.length : rootOnlyFirstNonImport + 1,
              0,
              disposeRootStatement(),
            );
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
              ...rootImportSpecifiers,
            ],
            t.stringLiteral(runtimeImport),
          ),
        );
        nextBody.splice(insertIndex + 1, 0, registryDeclaration);
        if (hasRootRender) nextBody.splice(insertIndex + 2, 0, disposeRootStatement());
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
                    t.blockStatement([
                      // When the refresh cannot be applied in place, hand the
                      // module back to Bun so it sequences a full reload against
                      // the rebuild instead of us racing it with location.reload().
                      t.ifStatement(
                        t.unaryExpression(
                          "!",
                          t.callExpression(refreshImport, [
                            t.memberExpression(importMetaHot(), t.identifier("data")),
                            t.identifier("nextModule"),
                          ]),
                        ),
                        t.expressionStatement(
                          t.callExpression(
                            t.memberExpression(importMetaHot(), t.identifier("invalidate")),
                            [],
                          ),
                        ),
                      ),
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
      const solidEntrypoints = solidRuntimeEntrypoints(hmr && generate === "dom");

      build.onResolve({ filter: /^solid-js$/ }, () => ({
        path: solidEntrypoints["solid-js"],
      }));

      build.onResolve({ filter: /^@solidjs\/(?:signals|web)$/ }, (args) => ({
        path: solidEntrypoints[args.path],
      }));

      build.onLoad({ filter: /node_modules\/lucide-solid\/.*\.js$/ }, async ({ path }) => ({
        contents: upgradeLucideImports(await Bun.file(path).text()),
        loader: "js",
      }));

      build.onLoad({ filter: /\.(?:ts|tsx|jsx)$/ }, async ({ path }) => {
        babel ??= await import("@babel/core");

        const result = await babel.transformFileAsync(path, {
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
