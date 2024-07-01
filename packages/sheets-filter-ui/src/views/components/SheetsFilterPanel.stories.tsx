/**
 * Copyright 2023-present DreamNum Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React, { useState } from 'react';
import type { Meta } from '@storybook/react';
import { RediContext } from '@wendellhu/redi/react-bindings';
import type { Injector } from '@wendellhu/redi';
import { UniverSheetsFilterPlugin } from '@univerjs/sheets-filter';
import type { IWorkbookData } from '@univerjs/core';
import { CommandType, ICommandService, ILogService, LocaleService, LocaleType, LogLevel, Plugin, Univer, UniverInstanceType } from '@univerjs/core';
import { RefRangeService, SheetInterceptorService, SheetsSelectionsService, WorksheetProtectionPointModel } from '@univerjs/sheets';
import { IMenuService, IShortcutService, MenuService, ShortcutService } from '@univerjs/ui';
import { SetCellEditVisibleOperation } from '@univerjs/sheets-ui';
import { SheetsFilterPanelService } from '../../services/sheets-filter-panel.service';
import { ClearSheetsFilterCriteriaCommand, ReCalcSheetsFilterCommand, SetSheetsFilterCriteriaCommand, SmartToggleSheetsFilterCommand } from '../../commands/sheets-filter.command';
import type { IOpenFilterPanelOperationParams } from '../../commands/sheets-filter.operation';
import { ChangeFilterByOperation, CloseFilterPanelOperation, OpenFilterPanelOperation } from '../../commands/sheets-filter.operation';
import enUS from '../../locale/en-US';
import zhCN from '../../locale/zh-CN';
import ruRU from '../../locale/ru-RU';
import { WithCustomFilterModelFactory, WithValuesFilterModelFactory } from '../../__testing__/data';
import { FilterPanel } from './SheetsFilterPanel';

const meta: Meta<typeof FilterPanel> = {
    title: 'Components / FilterPanel',
    component: FilterPanel,
    tags: ['autodocs'],
};

export default meta;

const FakeCetCellEditVisibleOperation = {
    id: SetCellEditVisibleOperation.id,
    type: CommandType.OPERATION,
    handler: () => true,
};

function createFilterStorybookBed(workbookData: IWorkbookData, locale: LocaleType = LocaleType.EN_US) {
    const univer = new Univer();
    const injector = univer.__getInjector();

    class TestPlugin extends Plugin {
        static override type = UniverInstanceType.UNIVER_SHEET;
        static override pluginName = 'test-plugin';

        constructor(_config: unknown, override readonly _injector: Injector) {
            super();
        }

        override onStarting(injector: Injector): void {
            injector.add([SheetsSelectionsService]);
            injector.add([IShortcutService, { useClass: ShortcutService }]);
            injector.add([IMenuService, { useClass: MenuService }]);
            injector.add([WorksheetProtectionPointModel]);
            injector.add([SheetInterceptorService]);
            injector.add([SheetsFilterPanelService]);
            injector.add([RefRangeService]);

            const commandService = injector.get(ICommandService);

            [
                FakeCetCellEditVisibleOperation,
                SmartToggleSheetsFilterCommand,
                SetSheetsFilterCriteriaCommand,
                ClearSheetsFilterCriteriaCommand,
                ReCalcSheetsFilterCommand,
                OpenFilterPanelOperation,
                CloseFilterPanelOperation,
                ChangeFilterByOperation,
            ].forEach((command) => commandService.registerCommand(command));

            commandService.syncExecuteCommand(OpenFilterPanelOperation.id, {
                unitId: 'test',
                subUnitId: 'sheet1',
                col: 0,
            } as IOpenFilterPanelOperationParams);
        }
    }

    univer.registerPlugin(UniverSheetsFilterPlugin);
    univer.registerPlugin(TestPlugin);

    injector.get(LocaleService).setLocale(locale);
    injector.get(LocaleService).load({ enUS, zhCN, ruRU });
    injector.get(ILogService).setLogLevel(LogLevel.VERBOSE);

    const sheet = univer.createUniverSheet(workbookData);

    return { univer, injector, sheet };
}

// TODO@ybzky: not working properly

export const FilterWithConditions = {
    render() {
        const [bed] = useState(() => createFilterStorybookBed(WithCustomFilterModelFactory()));
        const { injector } = bed;

        return (
            <RediContext.Provider value={{ injector }}>
                <FilterPanel />
            </RediContext.Provider>
        );
    },
};

export const FilterWithValues = {
    render() {
        const [bed] = useState(() => createFilterStorybookBed(WithValuesFilterModelFactory()));

        return (
            <RediContext.Provider value={{ injector: bed.injector }}>
                <FilterPanel />
            </RediContext.Provider>
        );
    },
};

export const FilterWithChinese = {
    render() {
        const [bed] = useState(() => createFilterStorybookBed(WithValuesFilterModelFactory(), LocaleType.ZH_CN));

        return (
            <RediContext.Provider value={{ injector: bed.injector }}>
                <FilterPanel />
            </RediContext.Provider>
        );
    },
};
