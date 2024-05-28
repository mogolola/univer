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

import type { IRange, Workbook } from '@univerjs/core';
import { ICommandService, IUniverInstanceService, UniverInstanceType } from '@univerjs/core';
import { deserializeRangeWithSheet, IDefinedNamesService, serializeRangeWithSheet } from '@univerjs/engine-formula';
import type { ISetSelectionsOperationParams } from '@univerjs/sheets';
import { NORMAL_SELECTION_PLUGIN_NAME, SetSelectionsOperation, SetWorksheetActiveOperation } from '@univerjs/sheets';

interface ISheetUrlParams {
    gid?: string;
    range?: string;
    rangeid?: string;
}

export class SheetsHyperLinkResolverService {
    constructor(
        @IUniverInstanceService private _univerInstanceService: IUniverInstanceService,
        @ICommandService private _commandService: ICommandService,
        @IDefinedNamesService private _definedNamesService: IDefinedNamesService
    ) { }

    private _getURLName(params: ISheetUrlParams) {
        const { gid, range, rangeid } = params;
        const workbook = this._univerInstanceService.getCurrentUnitForType<Workbook>(UniverInstanceType.UNIVER_SHEET);
        if (!workbook) {
            return null;
        }

        const sheet = gid ? workbook.getSheetBySheetId(gid) : workbook.getActiveSheet();
        const sheetName = sheet?.getName() ?? '';

        if (range) {
            return {
                type: 'range',
                name: serializeRangeWithSheet(sheetName, deserializeRangeWithSheet(range).range),
            } as const;
        }

        if (rangeid) {
            const range = this._definedNamesService.getValueById(rangeid, workbook.getUnitId());
            if (range) {
                return {
                    type: 'defineName',
                    name: range.formulaOrRefString,
                } as const;
            }
        }

        if (gid) {
            const worksheet = workbook.getSheetBySheetId(gid);
            if (worksheet) {
                return {
                    type: 'sheet',
                    name: worksheet.getName(),
                } as const;
            }
        }

        return null;
    }

    navigateTo(params: ISheetUrlParams) {
        const { gid, range, rangeid } = params;
        const workbook = this._univerInstanceService.getCurrentUnitForType<Workbook>(UniverInstanceType.UNIVER_SHEET);
        if (!workbook) {
            return;
        }
        const unitId = workbook.getUnitId();
        if (rangeid) {
            this.navigateToDefineName(unitId, rangeid);
        }

        if (!gid) {
            return;
        }

        if (range) {
            const rangeInfo = deserializeRangeWithSheet(range);
            this.navigateToRange(unitId, gid, rangeInfo.range);
        }

        this.navigateToSheetById(unitId, gid);
    }

    parseHyperLink(urlStr: string) {
        if (urlStr?.startsWith('#')) {
            const search = new URLSearchParams(urlStr.slice(1));
            // range, gid, rangeid
            const searchObj: ISheetUrlParams = {
                gid: search.get('gid') ?? '',
                range: search.get('range') ?? '',
                rangeid: search.get('rangeid') ?? '',
            };
            const urlInfo = this._getURLName(searchObj);
            return {
                type: urlInfo?.type || 'link',
                name: urlInfo?.name || urlStr,
                url: urlStr,
                searchObj,
                handler: () => {
                    this.navigateTo(searchObj);
                },
            } as const;
        } else {
            return {
                type: 'outer',
                name: urlStr,
                url: urlStr,
                handler: () => {
                    this.navigateToOtherWebsite(urlStr);
                },
            } as const;
        }
    }

    async navigateToRange(unitId: string, subUnitId: string, range: IRange) {
        if (await this.navigateToSheetById(unitId, subUnitId)) {
            this._commandService.executeCommand(
                SetSelectionsOperation.id,
                {
                    unitId,
                    subUnitId,
                    pluginName: NORMAL_SELECTION_PLUGIN_NAME,
                    selections: [{
                        primary: {
                            ...range,
                            actualColumn: range.startColumn,
                            actualRow: range.startRow,
                        },
                        range,
                    }],
                } as ISetSelectionsOperationParams
            );
        }
    }

    async navigateToSheet(unitId: string, sheetName: string) {
        const workbook = this._univerInstanceService.getUnit<Workbook>(unitId, UniverInstanceType.UNIVER_SHEET);
        if (!workbook) {
            return false;
        }
        const worksheet = workbook.getSheetBySheetName(sheetName);

        if (worksheet?.getName() === sheetName) {
            return true;
        }

        return await this._commandService.executeCommand(SetWorksheetActiveOperation.id, { unitId, subUnitId: worksheet?.getSheetId() });
    }

    async navigateToSheetById(unitId: string, subUnitId: string) {
        const workbook = this._univerInstanceService.getUnit<Workbook>(unitId, UniverInstanceType.UNIVER_SHEET);
        if (!workbook) {
            return false;
        }
        const worksheet = workbook.getActiveSheet();

        if (worksheet.getSheetId() === subUnitId) {
            return true;
        }

        return await this._commandService.executeCommand(SetWorksheetActiveOperation.id, { unitId, subUnitId });
    }

    async navigateToDefineName(unitId: string, rangeid: string) {
        this._definedNamesService.focusRange(unitId, rangeid);
        return true;
    }

    async navigateToOtherWebsite(url: string) {
        window.open(url, '_blank', 'noopener noreferrer');
    }
}
