
on('ready', () => {
    const center = new Center()
    const conditions = new Conditions()
    const concentration = new Concentration(conditions)
    const notes = new Notes()
    center.register()
    conditions.register()
    concentration.register()
    notes.register()
})
