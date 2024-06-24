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

import type { Nullable, Workbook } from '@univerjs/core';
import { BooleanNumber, DEFAULT_EMPTY_DOCUMENT_VALUE, DOCS_FORMULA_BAR_EDITOR_UNIT_ID_KEY, HorizontalAlign, IPermissionService, IUniverInstanceService, Rectangle, ThemeService, UniverInstanceType, VerticalAlign, WrapStrategy } from '@univerjs/core';
import { DeviceInputEventType } from '@univerjs/engine-render';
import { CheckMarkSingle, CloseSingle, DropdownSingle, FxSingle } from '@univerjs/icons';
import { KeyCode, ProgressBar, TextEditor } from '@univerjs/ui';
import { useDependency } from '@wendellhu/redi/react-bindings';
import clsx from 'clsx';
import React, { useEffect, useLayoutEffect, useState } from 'react';

import { RangeProtectionPermissionEditPoint, RangeProtectionRuleModel, SelectionManagerService, WorkbookEditablePermission, WorksheetEditPermission, WorksheetProtectionRuleModel, WorksheetSetCellValuePermission } from '@univerjs/sheets';
import type { Subscription } from 'rxjs';
import { merge } from 'rxjs';
import { IFormulaEditorManagerService } from '../../services/editor/formula-editor-manager.service';
import { IEditorBridgeService } from '../../services/editor-bridge.service';

import { DefinedName } from '../defined-name/DefinedName';
import styles from './index.module.less';

enum ArrowDirection {
    Down,
    Up,
}

export function FormulaBar() {
    const [iconStyle, setIconStyle] = useState<string>(styles.formulaGrey);
    const [arrowDirection, setArrowDirection] = useState<ArrowDirection>(ArrowDirection.Down);

    const formulaEditorManagerService = useDependency(IFormulaEditorManagerService);
    const editorBridgeService = useDependency(IEditorBridgeService);
    const themeService = useDependency(ThemeService);
    const progressBarColor = themeService.getCurrentTheme().primaryColor;
    const [disable, setDisable] = useState<boolean>(false);
    const univerInstanceService = useDependency(IUniverInstanceService);
    const selectionManager = useDependency(SelectionManagerService);
    const worksheetProtectionRuleModel = useDependency(WorksheetProtectionRuleModel);
    const rangeProtectionRuleModel = useDependency(RangeProtectionRuleModel);
    const permissionService = useDependency(IPermissionService);

    useLayoutEffect(() => {
        const workbook = univerInstanceService.getCurrentUnitForType<Workbook>(UniverInstanceType.UNIVER_SHEET)!;
        let innerSubscription: Subscription | null = null;
        const subscription = merge(
            worksheetProtectionRuleModel.ruleChange$,
            rangeProtectionRuleModel.ruleChange$,
            selectionManager.selectionMoveEnd$,
            workbook.activeSheet$
        ).subscribe(() => {
            innerSubscription?.unsubscribe();
            const unitId = workbook.getUnitId();
            const worksheet = workbook.getActiveSheet();
            if (!worksheet) return;
            const subUnitId = worksheet.getSheetId();
            const range = selectionManager.getLast()?.range;
            if (!range) return;
            const permissionIds: string[] = [];
            permissionIds.push(new WorkbookEditablePermission(unitId).id);
            permissionIds.push(new WorksheetSetCellValuePermission(unitId, subUnitId).id);
            permissionIds.push(new WorksheetEditPermission(unitId, subUnitId).id);

            const selectionRanges = selectionManager.getSelections()?.map((selection) => selection.range);
            const permissionList = rangeProtectionRuleModel.getSubunitRuleList(unitId, subUnitId).filter((rule) => {
                return rule.ranges.some((r) => {
                    return selectionRanges?.some((selectionRange) => {
                        return Rectangle.intersects(r, selectionRange);
                    });
                });
            });

            permissionList.forEach((p) => {
                permissionIds.push(new RangeProtectionPermissionEditPoint(unitId, subUnitId, p.permissionId).id);
            });

            innerSubscription = permissionService.composePermission$(permissionIds).subscribe((permissions) => {
                setDisable(!permissions.every((p) => p.value));
            });
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    const INITIAL_SNAPSHOT = {
        id: DOCS_FORMULA_BAR_EDITOR_UNIT_ID_KEY,
        body: {
            dataStream: `${DEFAULT_EMPTY_DOCUMENT_VALUE}`,
            textRuns: [],
            paragraphs: [
                {
                    startIndex: 0,
                },
            ],
        },
        documentStyle: {
            pageSize: {
                width: Number.POSITIVE_INFINITY,
                height: Number.POSITIVE_INFINITY,
            },
            marginTop: 5,
            marginBottom: 5,
            marginRight: 0,
            marginLeft: 0,
            paragraphLineGapDefault: 0,
            renderConfig: {
                horizontalAlign: HorizontalAlign.UNSPECIFIED,
                verticalAlign: VerticalAlign.TOP,
                centerAngle: 0,
                vertexAngle: 0,
                wrapStrategy: WrapStrategy.WRAP,
                isRenderStyle: BooleanNumber.FALSE,
            },
        },
    };

    useEffect(() => {
        const subscription = editorBridgeService.visible$.subscribe((visibleInfo) => {
            setIconStyle(visibleInfo.visible ? styles.formulaActive : styles.formulaGrey);
        });

        return () => subscription.unsubscribe();
    }, [editorBridgeService.visible$]);

    function resizeCallBack(editor: Nullable<HTMLDivElement>) {
        if (editor == null) {
            return;
        }

        const editorRect = editor.getBoundingClientRect();

        formulaEditorManagerService.setPosition(editorRect);
    }

    function handleArrowClick() {
        setArrowDirection(arrowDirection === ArrowDirection.Down ? ArrowDirection.Up : ArrowDirection.Down);

        const ANIMATION_DURATION = 150;
        setTimeout(() => {
            formulaEditorManagerService.handleFoldBtnClick(arrowDirection === ArrowDirection.Up);
        }, ANIMATION_DURATION);
    }

    // Handle click the "×" button.
    function handleCloseBtnClick() {
        const visibleState = editorBridgeService.isVisible();
        if (visibleState.visible) {
            editorBridgeService.changeVisible({
                visible: false,
                eventType: DeviceInputEventType.Keyboard,
                keycode: KeyCode.ESC,
            });
        }
    }

    // Handle click the "√" button.
    function handleConfirmBtnClick() {
        const visibleState = editorBridgeService.isVisible();
        if (visibleState.visible) {
            editorBridgeService.changeVisible({
                visible: false,
                eventType: DeviceInputEventType.PointerDown,
            });
        }
    }

    function handlerFxBtnClick() {
        formulaEditorManagerService.handleFxBtnClick(true);
    }

    return (
        <div
            className={styles.formulaBox}
            style={{
                height: ArrowDirection.Down === arrowDirection ? '28px' : '82px',
                pointerEvents: disable ? 'none' : 'auto',
            }}
        >
            <div className={styles.nameRanges}>
                <DefinedName disable={disable} />
            </div>

            <div className={styles.formulaBar}>
                <div className={clsx(styles.formulaIcon, { [styles.formulaIconDisable]: disable })}>
                    <div className={styles.formulaIconWrapper}>
                        <span
                            className={clsx(styles.iconContainer, styles.iconContainerError, iconStyle)}
                            onClick={handleCloseBtnClick}
                        >
                            <CloseSingle />
                        </span>

                        <span
                            className={clsx(styles.iconContainer, styles.iconContainerSuccess, iconStyle)}
                            onClick={handleConfirmBtnClick}
                        >
                            <CheckMarkSingle />
                        </span>

                        <span className={clsx(styles.iconContainer, styles.iconContainerFx)} onClick={handlerFxBtnClick}>
                            <FxSingle />
                        </span>
                    </div>
                </div>

                <div className={styles.formulaInput}>
                    <TextEditor
                        id={DOCS_FORMULA_BAR_EDITOR_UNIT_ID_KEY}
                        isSheetEditor={true}
                        resizeCallBack={resizeCallBack}
                        cancelDefaultResizeListener={true}
                        onContextMenu={(e) => e.preventDefault()}
                        className={styles.formulaContent}
                        snapshot={INITIAL_SNAPSHOT}
                        isSingle={false}
                    />
                    <div className={clsx(styles.arrowContainer, { [styles.arrowContainerDisable]: disable })} onClick={handleArrowClick}>
                        {arrowDirection === ArrowDirection.Down
                            ? (
                                <DropdownSingle />
                            )
                            : (
                                <DropdownSingle style={{ transform: 'rotateZ(180deg)' }} />
                            )}
                    </div>
                </div>
            </div>

            <ProgressBar barColor={progressBarColor} />
        </div>
    );
}
