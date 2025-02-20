import path from 'path';
import {
  manager,
  AppContext,
  CliPlugin,
  ToRunners,
  createAsyncWaterfall,
  ResolvedConfigContext,
} from '@modern-js/core';
import Chain from 'webpack-chain';
import { CHAIN_ID } from '@modern-js/utils';
import type { AppToolsHooks } from '@modern-js/app-tools';
import plugin from '../src/cli';
import './helper';

describe('bff cli plugin', () => {
  it('schema', async () => {
    const main = manager.clone().usePlugin(plugin as CliPlugin);
    const runner = await main.init();
    const result = await runner.validateSchema();

    expect(result).toMatchSnapshot();
  });

  it('routes', async () => {
    const main = manager.clone().usePlugin(plugin as CliPlugin);
    main.registerHook({
      modifyServerRoutes: createAsyncWaterfall(),
    } as any);
    const runner: ToRunners<AppToolsHooks> = (await main.init()) as any;
    ResolvedConfigContext.set({
      bff: {
        enableHandleWeb: true,
      },
    } as any);
    const result = await runner.modifyServerRoutes({
      routes: [
        {
          urlPath: '/',
          entryPath: '',
          isApi: false,
        },
      ],
    });

    expect(result).toMatchSnapshot();
  });

  it('config', async () => {
    const main = manager.clone().usePlugin(plugin as CliPlugin);
    const runner = await main.init();
    const result = await runner.config();

    expect(result).toMatchSnapshot();
  });

  it('config bundler chain', async () => {
    const main = manager.clone().usePlugin(plugin as CliPlugin);
    const runner = await main.init();
    const [{ tools }]: any = await runner.config();
    const chain = new Chain();
    AppContext.set({
      appDirectory: path.resolve('./fixtures/function'),
      apiDirectory: path.resolve('./fixtures/function/api'),
      port: 3000,
    } as any);
    tools.bundlerChain(chain, { CHAIN_ID });

    const config = chain.toConfig();
    expect(config.module?.rules?.[1]).toMatchObject({
      test: /.\/fixtures\/function\/api\/\.*(\.[tj]s)$/,
      use: [
        {
          loader: require.resolve('../src/loader.ts').replace(/\\/g, '/'),
          options: {
            existLambda: false,
            apiDir: path.resolve('./fixtures/function/api'),
            lambdaDir: path.resolve('./fixtures/function/api'),
            port: 3000,
            prefix: '/api',
          },
        },
      ],
    });

    expect(config.resolve).toMatchObject({
      alias: {
        '@api': path.resolve('./fixtures/function/api'),
      },
    });
  });
});
