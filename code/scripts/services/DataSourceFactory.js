const { DataSource } = WebCardinal.dataSources;

class TableDataSource extends DataSource {
    constructor(data) {
        super();
        this.model.tableData = data;
    }

    setNumberOfColumns(noOfColumns) {
        return this.model.noOfColumns = noOfColumns;
    }

    setDataSourcePageSize(pageSize) {
        this.model.elements = pageSize;
        this.setPageSize(this.model.elements);
    }

    async getPageDataAsync(startOffset, dataLengthForCurrentPage) {
        console.log({ startOffset, dataLengthForCurrentPage });
        if (this.model.tableData.length <= dataLengthForCurrentPage) {
            this.setPageSize(this.model.tableData.length);
        }
        else {
            this.setPageSize(this.model.elements);
        }
        let slicedData = [];
        this.setRecordsNumber(this.model.tableData.length);
        if (dataLengthForCurrentPage > 0) {
            slicedData = Object.entries(this.model.tableData).slice(startOffset, startOffset + dataLengthForCurrentPage).map(entry => entry[1]);
            console.log(slicedData)
        } else {
            slicedData = Object.entries(this.model.tableData).slice(0, startOffset - dataLengthForCurrentPage).map(entry => entry[1]);
            console.log(slicedData)
        }
        return slicedData;
    }
}

export default class DataSourceFactory {

    static createDataSource(noOfColumns,itemsPerPage, data) { 
        const tableDataSource = new TableDataSource(data);
        tableDataSource.setDataSourcePageSize(itemsPerPage);
        tableDataSource.setNumberOfColumns(noOfColumns);
        return tableDataSource;
    }
}
