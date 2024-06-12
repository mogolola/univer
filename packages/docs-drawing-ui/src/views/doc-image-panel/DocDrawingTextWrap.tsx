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

import type { Nullable } from '@univerjs/core';
import { ICommandService, LocaleService, WrapTextType } from '@univerjs/core';
import { useDependency } from '@wendellhu/redi/react-bindings';
import React, { useState } from 'react';
import clsx from 'clsx';
import { IRenderManagerService } from '@univerjs/engine-render';
import type { IDocDrawing } from '@univerjs/docs-drawing';
import { IDrawingManagerService, type IDrawingParam } from '@univerjs/drawing';
import { InputNumber, Radio, RadioGroup } from '@univerjs/design';
import { TextWrappingStyle, UpdateDocDrawingWrappingStyleCommand } from '../../commands/commands/update-doc-drawing.command';
import styles from './index.module.less';

export interface IDocDrawingTextWrapProps {
    drawings: IDrawingParam[];
}

interface IDistToText {
    top: number;
    left: number;
    bottom: number;
    right: number;
}

export const DocDrawingTextWrap = (props: IDocDrawingTextWrapProps) => {
    const commandService = useDependency(ICommandService);
    const localeService = useDependency(LocaleService);
    const drawingManagerService = useDependency(IDrawingManagerService);
    const renderManagerService = useDependency(IRenderManagerService);

    const { drawings } = props;

    const drawingParam = drawings[0] as IDocDrawing;

    if (drawingParam == null) {
        return;
    }

    const { unitId } = drawingParam;

    const renderObject = renderManagerService.getRenderById(unitId);
    const scene = renderObject?.scene;
    if (scene == null) {
        return;
    }

    const [wrappingStyle, setWrappingStyle] = useState(TextWrappingStyle.INLINE);

    function handleWrappingStyleChange(value: number | string | boolean) {
        setWrappingStyle(value as TextWrappingStyle);

        const focusDrawings = drawingManagerService.getFocusDrawings();
        if (focusDrawings.length === 0) {
            return;
        }

        const drawings = focusDrawings.map((drawing) => {
            return {
                unitId: drawing.unitId,
                subUnitId: drawing.subUnitId,
                drawingId: drawing.drawingId,
            };
        });

        commandService.executeCommand(UpdateDocDrawingWrappingStyleCommand.id, {
            unitId: focusDrawings[0].unitId,
            subUnitId: focusDrawings[0].unitId,
            drawings,
            wrappingStyle: value as TextWrappingStyle,
        });
    }

    const [wrapText, setWrapText] = useState('');

    function handleWrapTextChange(value: number | string | boolean) {
        setWrapText(value as string);
    }

    const [distToText, setDistToText] = useState<IDistToText>({
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
    });

    function handleDistToTextChange(value: Nullable<number>, direction: 'top' | 'left' | 'bottom' | 'right') {
        if (value == null) {
            return;
        }

        const newDistToText = { ...distToText, [direction]: value };
        setDistToText(newDistToText as IDistToText);
    }

    return (
        <div className={clsx(styles.imageCommonPanelGrid, styles.imageCommonPanelBorder)}>
            <div className={styles.imageCommonPanelRow}>
                <div className={clsx(styles.imageCommonPanelColumn, styles.imageCommonPanelTitle)}>
                    <div>{localeService.t('image-text-wrap.title')}</div>
                </div>
            </div>
            <div className={styles.imageCommonPanelRow}>
                <div className={clsx(styles.imageCommonPanelColumn, styles.imageCommonPanelSubtitle)}>
                    <div>{localeService.t('image-text-wrap.wrappingStyle')}</div>
                </div>
            </div>
            <div className={clsx(styles.imageCommonPanelRow)}>
                <div className={clsx(styles.imageCommonPanelColumn)}>
                    <RadioGroup value={wrappingStyle} onChange={handleWrappingStyleChange} direction="vertical">
                        <Radio value={TextWrappingStyle.INLINE}>{localeService.t('image-text-wrap.inline')}</Radio>
                        <Radio value={TextWrappingStyle.WRAP_SQUARE}>{localeService.t('image-text-wrap.square')}</Radio>
                        <Radio value={TextWrappingStyle.WRAP_TOP_AND_BOTTOM}>{localeService.t('image-text-wrap.topAndBottom')}</Radio>
                        <Radio value={TextWrappingStyle.BEHIND_TEXT}>{localeService.t('image-text-wrap.behindText')}</Radio>
                        <Radio value={TextWrappingStyle.IN_FRONT_OF_TEXT}>{localeService.t('image-text-wrap.inFrontText')}</Radio>
                    </RadioGroup>
                </div>
            </div>

            <div className={styles.imageCommonPanelRow}>
                <div className={clsx(styles.imageCommonPanelColumn, styles.imageCommonPanelSubtitle)}>
                    <div>{localeService.t('image-text-wrap.wrapText')}</div>
                </div>
            </div>
            <div className={clsx(styles.imageCommonPanelRow)}>
                <div className={clsx(styles.imageCommonPanelColumn)}>
                    <RadioGroup value={wrapText} onChange={handleWrapTextChange} direction="horizontal">
                        <Radio value={WrapTextType.BOTH_SIDES}>{localeService.t('image-text-wrap.bothSide')}</Radio>
                        <Radio value={WrapTextType.LEFT}>{localeService.t('image-text-wrap.leftOnly')}</Radio>
                        <Radio value={WrapTextType.RIGHT}>{localeService.t('image-text-wrap.rightOnly')}</Radio>
                    </RadioGroup>
                </div>
            </div>

            <div className={styles.imageCommonPanelRow}>
                <div className={clsx(styles.imageCommonPanelColumn, styles.imageCommonPanelSubtitle)}>
                    <div>{localeService.t('image-text-wrap.distanceFromText')}</div>
                </div>
            </div>

            <div className={styles.imageCommonPanelRow}>
                <div className={clsx(styles.imageCommonPanelColumn, styles.imageCommonPanelSpan2)}>
                    <label>
                        <div className={styles.imageCommonPanelRow}>
                            <div className={styles.imageCommonPanelColumn}>
                                {localeService.t('image-text-wrap.top')}
                            </div>
                        </div>
                        <div className={styles.imageCommonPanelRow}>
                            <div className={styles.imageCommonPanelColumn}>
                                <InputNumber precision={1} value={distToText.top} onChange={(val) => { handleDistToTextChange(val, 'top'); }} className={styles.imageCommonPanelInput} />
                            </div>
                        </div>
                    </label>
                </div>
                <div className={clsx(styles.imageCommonPanelColumn, styles.imageCommonPanelSpan2)}>
                    <label>
                        <div className={styles.imageCommonPanelRow}>
                            <div className={styles.imageCommonPanelColumn}>
                                {localeService.t('image-text-wrap.left')}
                            </div>
                        </div>
                        <div className={styles.imageCommonPanelRow}>
                            <div className={styles.imageCommonPanelColumn}>
                                <InputNumber precision={1} value={distToText.left} onChange={(val) => { handleDistToTextChange(val, 'left'); }} className={styles.imageCommonPanelInput} />
                            </div>
                        </div>
                    </label>
                </div>
            </div>
            <div className={styles.imageCommonPanelRow}>
                <div className={clsx(styles.imageCommonPanelColumn, styles.imageCommonPanelSpan2)}>
                    <label>
                        <div className={styles.imageCommonPanelRow}>
                            <div className={styles.imageCommonPanelColumn}>
                                {localeService.t('image-text-wrap.bottom')}
                            </div>
                        </div>
                        <div className={styles.imageCommonPanelRow}>
                            <div className={styles.imageCommonPanelColumn}>
                                <InputNumber precision={1} value={distToText.bottom} onChange={(val) => { handleDistToTextChange(val, 'bottom'); }} className={styles.imageCommonPanelInput} />
                            </div>
                        </div>
                    </label>
                </div>
                <div className={clsx(styles.imageCommonPanelColumn, styles.imageCommonPanelSpan2)}>
                    <label>
                        <div className={styles.imageCommonPanelRow}>
                            <div className={styles.imageCommonPanelColumn}>
                                {localeService.t('image-text-wrap.right')}
                            </div>
                        </div>
                        <div className={styles.imageCommonPanelRow}>
                            <div className={styles.imageCommonPanelColumn}>
                                <InputNumber precision={1} value={distToText.right} onChange={(val) => { handleDistToTextChange(val, 'right'); }} className={styles.imageCommonPanelInput} />
                            </div>
                        </div>
                    </label>
                </div>
            </div>
        </div>
    );
};
