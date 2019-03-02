/* eslint-disable */
import * as child_process from 'node-services/lib/child_process';
import * as net from 'node-services/lib/net';
import { default as Module } from 'node-services/lib/module';
import preval from 'preval.macro';
import resolve from 'resolve';

import { METADATA } from './metadata';

const PREFIX = '/vs';

const global: any = self || window;
global.global = typeof window === 'undefined' ? self : window;
let requiresDefined = false;

function initializeRequires() {
  global.require.define('vs/platform/node/product', [], () => {
    return {
      default: preval`
      module.exports = require('../../../../../standalone-packages/vscode/product.json');
      `,
    };
  });
  global.require.define('vs/platform/node/package', [], () => {
    return {
      default: preval`
      module.exports = require('../../../../../standalone-packages/vscode/package.json');
      `,
    };
  });

  global.require.define('path', [], () => {
    const path = require('path');
    return {
      ...path,
      posix: path,
    };
  });

  global.require.define('util', [], () => {
    return require('util');
  });

  global.require.define('string_decoder', [], () => {
    return require('string_decoder');
  });

  global.require.define('crypto', [], () => {
    return {
      createHash: () => require('crypto-browserify').createHash('sha1'),
    };
  });

  global.require.define('node-pty', [], () => {
    return {};
  });

  global.require.define('vs/workbench/node/proxyResolver', [], () => {
    return {
      connectProxyResolver: () => Promise.resolve(undefined),
    };
  });

  global.require.define('os', [], () => {
    return { tmpdir: () => '/tmp' };
  });

  global.require.define('vs/base/node/encoding', [], () => {
    return {
      UTF8: 'utf8',
      UTF8_with_bom: 'utf8bom',
      UTF16be: 'utf16be',
      UTF16le: 'utf16le',
    };
  });

  global.require.define('child_process', [], () => {
    return child_process;
  });

  global.require.define('electron', [], () => {
    return {};
  });

  global.require.define('net', [], () => {
    return net;
  });

  global.require.define('fs', [], () => {
    return global.BrowserFS.BFSRequire('fs');
  });

  global.require.define('semver', [], () => {
    return require('semver');
  });

  global.require.define('assert', [], () => {
    return require('assert');
  });

  global.require.define('vs/base/common/amd', [], () => ({
    getPathFromAmdModule: (_, relativePath) =>
      require('path').join('/vs', relativePath),
  }));

  global.require.define('vs/platform/request/node/request', [], () => {
    // TODO
    return {};
  });

  global.require.define('vs/base/node/request', [], () => {
    // TODO
    return {};
  });

  global.require.define('vs/base/node/proxy', [], () => {
    // TODO
    return {};
  });

  global.require.define('vscode-textmate', [], () => {
    return require('vscode-textmate/out/main');
  });

  global.require.define('yauzl', [], () => {
    // TODO: install yauzl
  });
}

export default function(requiredModule?: string[], isVSCode = false) {
  var IS_FILE_PROTOCOL = global.location.protocol === 'file:';
  var DIRNAME = null;
  if (IS_FILE_PROTOCOL) {
    var port = global.location.port;
    if (port.length > 0) {
      port = ':' + port;
    }
    DIRNAME =
      global.location.protocol +
      '//' +
      global.location.hostname +
      port +
      global.location.pathname.substr(
        0,
        global.location.pathname.lastIndexOf('/')
      );

    var bases = document.getElementsByTagName('base');
    if (bases.length > 0) {
      DIRNAME = DIRNAME + '/' + bases[0].getAttribute('href');
    }
  }

  var LOADER_OPTS = (function() {
    function parseQueryString() {
      var str = global.location.search;
      str = str.replace(/^\?/, '');
      var pieces = str.split(/&/);
      var result = {};
      pieces.forEach(function(piece) {
        var config = piece.split(/=/);
        result[config[0]] = config[1];
      });
      return result;
    }
    var overwrites = parseQueryString();
    var result = {};
    result['editor'] = overwrites['editor'] || 'src';
    METADATA.PLUGINS.map(function(plugin) {
      result[plugin.name] =
        overwrites[plugin.name] || (process.env.VSCODE ? 'src' : 'npm/min');
    });
    return result;
  })();
  function toHREF(search) {
    var port = global.location.port;
    if (port.length > 0) {
      port = ':' + port;
    }
    return (
      global.location.protocol +
      '//' +
      global.location.hostname +
      port +
      global.location.pathname +
      search +
      global.location.hash
    );
  }

  function Component(name: string, modulePrefix: string, paths, contrib?: any) {
    this.name = name;
    this.modulePrefix = modulePrefix;
    this.paths = paths;
    this.contrib = contrib;
    this.selectedPath = LOADER_OPTS[name];
  }
  Component.prototype.isRelease = function() {
    return /release/.test(this.selectedPath);
  };
  Component.prototype.getResolvedPath = function() {
    var resolvedPath = this.paths[this.selectedPath];
    if (
      this.selectedPath === 'npm/dev' ||
      this.selectedPath === 'npm/min' ||
      this.isRelease()
    ) {
      if (IS_FILE_PROTOCOL) {
        resolvedPath = DIRNAME + '/../' + resolvedPath;
      } else {
        if (resolvedPath.startsWith('../')) {
          resolvedPath = '/' + resolvedPath.replace('../', '');
        }
      }
    } else {
      if (IS_FILE_PROTOCOL) {
        resolvedPath = DIRNAME + '/../..' + resolvedPath;
      }
    }
    return resolvedPath;
  };
  Component.prototype.generateLoaderConfig = function(dest) {
    dest[this.modulePrefix] =
      process.env.CODESANDBOX_HOST + this.getResolvedPath();
  };
  Component.prototype.generateUrlForPath = function(pathName) {
    var NEW_LOADER_OPTS = {};
    Object.keys(LOADER_OPTS).forEach(function(key) {
      NEW_LOADER_OPTS[key] =
        LOADER_OPTS[key] === 'npm/dev' ? undefined : LOADER_OPTS[key];
    });
    NEW_LOADER_OPTS[this.name] = pathName === 'npm/dev' ? undefined : pathName;

    var search = Object.keys(NEW_LOADER_OPTS)
      .map(function(key) {
        var value = NEW_LOADER_OPTS[key];
        if (value) {
          return key + '=' + value;
        }
        return '';
      })
      .filter(function(assignment) {
        return !!assignment;
      })
      .join('&');
    if (search.length > 0) {
      search = '?' + search;
    }
    return toHREF(search);
  };
  Component.prototype.renderLoadingOptions = function() {
    return (
      '<strong style="width:130px;display:inline-block;">' +
      this.name +
      '</strong>:&nbsp;&nbsp;&nbsp;' +
      Object.keys(this.paths)
        .map(
          function(pathName) {
            if (pathName === this.selectedPath) {
              return '<strong>' + pathName + '</strong>';
            }
            return (
              '<a href="' +
              this.generateUrlForPath(pathName) +
              '">' +
              pathName +
              '</a>'
            );
          }.bind(this)
        )
        .join('&nbsp;&nbsp;&nbsp;')
    );
  };

  var RESOLVED_CORE = new Component('editor', 'vs', METADATA.CORE.paths);
  global.RESOLVED_CORE_PATH = RESOLVED_CORE.getResolvedPath();
  var RESOLVED_PLUGINS = METADATA.PLUGINS.map(function(plugin) {
    return new Component(
      plugin.name,
      plugin.modulePrefix,
      plugin.paths,
      plugin.contrib
    );
  });

  function loadScript(path, callback) {
    if (typeof document !== 'undefined') {
      var script = document.createElement('script');
      script.onload = callback;
      script.async = true;
      script.type = 'text/javascript';
      script.src = path;
      document.head.appendChild(script);
    } else {
      global.importScripts(path);
      callback();
    }
  }

  (function() {
    if (process.env.DEBUG_VERSION) {
      var allComponents = [RESOLVED_CORE];
      if (!RESOLVED_CORE.isRelease()) {
        allComponents = allComponents.concat(RESOLVED_PLUGINS);
      }

      var div = document.createElement('div');
      div.style.position = 'fixed';
      div.style.top = '0';
      div.style.right = '0';
      div.style.background = 'lightgray';
      div.style.padding = '5px 20px 5px 5px';
      div.style.zIndex = '1000';

      div.innerHTML =
        '<ul><li>' +
        allComponents
          .map(function(component) {
            return component.renderLoadingOptions();
          })
          .join('</li><li>') +
        '</li></ul>';

      document.body.appendChild(div);

      var aElements = document.getElementsByTagName('a');
      for (var i = 0; i < aElements.length; i++) {
        var aElement = aElements[i];
        if (aElement.className === 'loading-opts') {
          aElement.href += global.location.search;
        }
      }
    }
  })();

  return function(callback: () => void, PATH_PREFIX?: string) {
    PATH_PREFIX = PATH_PREFIX || '';

    global.nodeRequire = path => {
      if (path.indexOf('/extensions/') === 0) {
        const resolvedPath = resolve.sync(path);

        const module = new Module(path);
        module.load(resolvedPath);

        return module.exports;
      }

      if (path === 'module') {
        return Module;
      }

      if (path === 'native-watchdog') {
        return { start: () => {} };
      }
    };

    function loadFiles() {
      var loaderPathsConfig = {
        'vs/language/vue': '/public/13/vs/language/vue',
      };
      if (!RESOLVED_CORE.isRelease()) {
        RESOLVED_PLUGINS.forEach(function(plugin) {
          plugin.generateLoaderConfig(loaderPathsConfig);
        });
      }
      RESOLVED_CORE.generateLoaderConfig(loaderPathsConfig);

      if (process.env.NODE_ENV === 'development') {
        console.log('LOADER CONFIG: ');
        console.log(JSON.stringify(loaderPathsConfig, null, '\t'));
      }

      const requireToUrl = p => require('path').join('/vs', p);
      global.require.toUrl = requireToUrl;

      if (!requiresDefined && global.require.define) {
        requiresDefined = true;
        initializeRequires();

        if (process.env.NODE_ENV === 'development') {
          console.log('setting config', global.AMDLoader);
        }

        // global.require.config({ requireToUrl, paths: { vs: '/public/vscode' } });
        global.require.config({
          // isBuild: true,
          paths: loaderPathsConfig,
          requireToUrl,
        });
      }

      global.deps = new Set();

      if (requiredModule) {
        global.require(requiredModule, function(a) {
          if (!isVSCode && !RESOLVED_CORE.isRelease()) {
            // At this point we've loaded the monaco-editor-core
            global.require(
              RESOLVED_PLUGINS.map(function(plugin) {
                return plugin.contrib;
              }),
              function() {
                // At this point we've loaded all the plugins
                callback();
              }
            );
          } else {
            callback();
          }
        });
      } else {
        callback();
      }
    }

    if (global.require) {
      loadFiles();
    } else {
      loadScript(
        PATH_PREFIX + RESOLVED_CORE.getResolvedPath() + '/loader.js',
        loadFiles
      );
    }
  };
}