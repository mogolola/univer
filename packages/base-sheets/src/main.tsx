import { UniverSheet } from '@univer/core';
import { RenderEngine } from '@univer/base-render';
import { UniverComponentSheet } from '@univer/style-universheet';
import { ClipboardPlugin } from '@univer/sheets-plugin-clipboard';
import { NumfmtPlugin } from '@univer/sheets-plugin-numfmt';
import { DEFAULT_FORMULA_DATA, FormulaPlugin } from '@univer/sheets-plugin-formula';
import { DEFAULT_WORKBOOK_DATA } from '@univer/common-plugin-data';
import { SheetPlugin } from './SheetPlugin';

const uiDefaultConfigUp = {
    container: 'universheet-demo-up',
    layout: {
        innerRight: false,
        outerLeft: false,
        toolBarConfig: {
            paintFormat: false,
            currencyFormat: false,
            percentageFormat: false,
            numberDecrease: false,
            numberIncrease: false,
            moreFormats: false,
        },
    },
};

const univerSheetUp = UniverSheet.newInstance(DEFAULT_WORKBOOK_DATA);
univerSheetUp.installPlugin(new RenderEngine());
univerSheetUp.installPlugin(new UniverComponentSheet());
FormulaPlugin.create(DEFAULT_FORMULA_DATA).installTo(univerSheetUp);

let sheetPlugin = new SheetPlugin(uiDefaultConfigUp);
let clipboardPlugin = new ClipboardPlugin();
univerSheetUp.installPlugin(sheetPlugin);
univerSheetUp.installPlugin(clipboardPlugin);
univerSheetUp.installPlugin(new NumfmtPlugin());
(window as any).sheetPlugin = sheetPlugin;

// const univerSheetDown = UniverSheet.newInstance({
//     id: 'book-02',
// });
// univerSheetDown.installPlugin(new RenderEngine());
// univerSheetDown.installPlugin(new UniverComponentSheet());
// FormulaPlugin.create().installTo(univerSheetDown);

// univerSheetDown.installPlugin(
//     new SheetPlugin({
//         container: 'universheet-demo-down',
//     })
// );
// univerSheetDown.installPlugin(new ClipboardPlugin());
// univerSheetDown.installPlugin(new NumfmtPlugin());
